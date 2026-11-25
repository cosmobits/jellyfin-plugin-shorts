using System.Net;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Jellyfin.Plugin.Shorts;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace Jellyfin.Plugin.Shorts.Tests;

public sealed class WebTests
{
    private static async Task<WebApplication> Server()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Services.AddControllers().AddApplicationPart(typeof(ShortsController).Assembly);
        builder.Services.AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestAuth>("Test", _ => { });
        builder.Services.AddAuthorization();
        var app = builder.Build();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        await app.StartAsync();
        return app;
    }

    [Fact]
    public async Task PageRequiresAuthentication()
    {
        await using var server = await Server();
        using var client = server.GetTestClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/Shorts/Page")).StatusCode);
        client.DefaultRequestHeaders.Add("X-Test-User", "viewer");
        var page = await client.GetAsync("/Shorts/Page");
        Assert.Equal(HttpStatusCode.OK, page.StatusCode);
        var body = await page.Content.ReadAsStringAsync();
        Assert.Contains("mountJellyfin", body);
        Assert.DoesNotContain("api_key=", body);
    }

    [Theory]
    [InlineData("shorts.js", "javascript")]
    [InlineData("shorts.css", "css")]
    public async Task ServesOnlyBundledPublicAssets(string asset, string contentType)
    {
        await using var server = await Server();
        using var client = server.GetTestClient();
        var response = await client.GetAsync($"/Shorts/Assets/{asset}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(contentType, response.Content.Headers.ContentType!.MediaType!);
        var body = await response.Content.ReadAsStringAsync();
        Assert.NotEmpty(body);
        Assert.DoesNotContain("process.env.NODE_ENV", body);
    }

    [Theory]
    [InlineData("config.json")]
    [InlineData("appsettings.json")]
    [InlineData("ShortsController.cs")]
    public async Task DoesNotExposeOtherResources(string asset)
    {
        await using var server = await Server();
        using var client = server.GetTestClient();
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/Shorts/Assets/{asset}")).StatusCode);
    }
}

public sealed class TestAuth(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.ContainsKey("X-Test-User")) return Task.FromResult(AuthenticateResult.NoResult());
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "viewer")], Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
    }
}
