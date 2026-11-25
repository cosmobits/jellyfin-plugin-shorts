using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.Shorts;

[ApiController]
[Route("Shorts")]
public sealed class ShortsController : ControllerBase
{
    [Authorize]
    [HttpGet("Page")]
    public IActionResult Page() => Resource("Web.page.html", "text/html; charset=utf-8");

    // Public code only: no configuration, session data or filesystem paths are served.
    [AllowAnonymous]
    [HttpGet("Assets/{name}")]
    public IActionResult Asset(string name) => name switch
    {
        "shorts.js" => Resource("Web.dist.shorts.js", "text/javascript; charset=utf-8"),
        "shorts.css" => Resource("Web.dist.shorts.css", "text/css; charset=utf-8"),
        _ => NotFound()
    };

    private IActionResult Resource(string name, string contentType)
    {
        var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream($"Jellyfin.Plugin.Shorts.{name}");
        return stream is null ? NotFound() : File(stream, contentType);
    }
}
