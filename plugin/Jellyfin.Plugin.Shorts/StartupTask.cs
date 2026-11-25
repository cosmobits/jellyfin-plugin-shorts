using System.Reflection;
using System.Runtime.Loader;
using MediaBrowser.Model.Tasks;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Jellyfin.Plugin.Shorts;

/// <summary>Register after plugins have loaded, using Plugin Pages' public reflection interface.</summary>
public sealed class StartupTask(ILogger<StartupTask> logger) : IScheduledTask
{
    public string Name => "Register Shorts page";
    public string Key => "Jellyfin.Plugin.Shorts.RegisterPage";
    public string Description => "Register the Shorts navigation entry with Plugin Pages.";
    public string Category => "Shorts";

    public Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var assembly = AssemblyLoadContext.All.SelectMany(context => context.Assemblies)
            .FirstOrDefault(candidate => candidate.GetName().Name == "Jellyfin.Plugin.PluginPages");
        var register = assembly?.GetType("Jellyfin.Plugin.PluginPages.PluginInterface")?
            .GetMethod("RegisterPage", BindingFlags.Public | BindingFlags.Static);
        if (register is null)
        {
            logger.LogWarning("Shorts requires Plugin Pages and File Transformation compatible with Jellyfin 12.2. Install them and restart Jellyfin.");
            return Task.CompletedTask;
        }
        var json = JsonSerializer.Serialize(new
        {
            id = Plugin.PluginId,
            url = "/Shorts/Page",
            displayText = "Shorts",
            icon = "video_library"
        });
        // Use Plugin Pages' own payload type across plugin assembly load contexts.
        var payloadType = register.GetParameters()[0].ParameterType;
        var parse = payloadType.GetMethod("Parse", [typeof(string)])
            ?? throw new InvalidOperationException("Plugin Pages payload API is unsupported.");
        var payload = parse.Invoke(null, [json]);
        register.Invoke(null, [payload]);
        progress.Report(100);
        logger.LogInformation("Registered the Shorts page.");
        return Task.CompletedTask;
    }

    public IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
    {
        yield return new TaskTriggerInfo { Type = TaskTriggerInfoType.StartupTrigger };
    }
}
