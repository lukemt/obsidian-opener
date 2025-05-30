import { App, PluginSettingTab, Notice, Platform, Setting } from "obsidian";
import Opener from "./main";

export class OpenerSettingTab extends PluginSettingTab {
  plugin: Opener;

  constructor(app: App, plugin: Opener) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const plugin = this.plugin;
    containerEl.empty();
    new Setting(containerEl)
      .setName("New tab by default")
      .setDesc(
        "Enable to open new files in a new tab (or existing tab, if it was previously opened). Disable for default Obsidian behavior."
      )
      .addToggle((toggle) =>
        toggle.setValue(plugin.settings.newTab).onChange((value) => {
          plugin.settings.newTab = value;
          plugin.saveSettings();
        })
      );
    new Setting(containerEl)
      .setName("PDF default app")
      .setDesc(
        "Enable to open pdfs with system viewer app. Disable for default behavior (open pdfs in Obsidian)."
      )
      .addToggle((toggle) =>
        toggle.setValue(plugin.settings.PDFApp).onChange((value) => {
          plugin.settings.PDFApp = value;
          plugin.saveSettings();
        })
      );
    new Setting(containerEl)
      .setName("Default app only when Ctrl/Cmd key is held")
      .setDesc(
        "Open in default app only when Ctrl/Cmd-Key is held. Disable to always open with system viewer."
      )
      .addToggle((toggle) =>
        toggle.setValue(plugin.settings.extOnlyWhenMetaKey).onChange((value) => {
          plugin.settings.extOnlyWhenMetaKey = value;
          plugin.saveSettings();
        })
      );
    new Setting(containerEl)
      .setName("Open everything outside of Obsidian")
      .setDesc(
        "Enable to open all obsidian supported extensions with system viewer instead. Disable for default behavior (open within Obsidian). Defaults supported extensions are 'png', 'webp', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'mp3', 'webm', 'wav', 'm4a', 'ogg','3gp', 'flac', 'mp4', 'ogv', 'mov', 'mkv'."
      )
      .addToggle((toggle) =>
        toggle.setValue(plugin.settings.allExt).onChange((value) => {
          plugin.settings.allExt = value;
          plugin.saveSettings();
        })
      );
    new Setting(containerEl)
      .setName("Open outside Obsidian: manual list")
      .setDesc("This shouldn't be necessary, but you can manually enable custom extensions here.")
      .addToggle((toggle) =>
        toggle.setValue(plugin.settings.custExt).onChange((value) => {
          plugin.settings.custExt = value;
          plugin.saveSettings();
          this.display();
        })
      );
    if (plugin.settings.custExt) {
      new Setting(containerEl)
        .setName("Manual list")
        .setDesc("Enter extension names (without the dot, ie, just docx separated by newlines).")
        .addTextArea((textArea) => {
          textArea.inputEl.rows = 5;
          textArea
            .setValue(plugin.settings.custExtList.join('\n'))
            .onChange(async (value) => {
              plugin.settings.custExtList = value.split('\n');
              plugin.saveSettings();
            });
        })
        .settingEl.style.borderTop = "none"; // Removes the separator line
    }
  }
}
