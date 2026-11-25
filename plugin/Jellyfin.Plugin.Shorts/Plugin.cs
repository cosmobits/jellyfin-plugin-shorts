using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.Shorts;

public sealed class PluginConfiguration : BasePluginConfiguration { }

public sealed class Plugin(IApplicationPaths paths, IXmlSerializer serializer)
    : BasePlugin<PluginConfiguration>(paths, serializer), IHasWebPages
{
    public const string PluginId = "c7c09a75-f1ae-42b5-afd2-6b770ab7301a";
    public override Guid Id => Guid.Parse(PluginId);
    public override string Name => "Shorts";
    public override string Description => "Discover moments from your library in a swipeable video feed.";
    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = "Shorts", DisplayName = "Shorts",
            EmbeddedResourcePath = "Jellyfin.Plugin.Shorts.Configuration.config.html"
        };
    }
}
