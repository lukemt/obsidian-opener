import {
	Plugin,
	App,
	OpenViewState,
	Workspace,
	WorkspaceLeaf,
	MarkdownView,
	Notice,
	TFile,
	PluginSettingTab,
	Setting,
	PaneType, Editor
} from 'obsidian';
import { around } from 'monkey-around';
import { OpenerSettingTab } from './settings';
import { DEFAULT_SETTINGS } from './constants';
import { OpenerSetting } from './types';

export default class Opener extends Plugin {
	settings: OpenerSetting;
	isMetaKeyHeld: boolean = false;
	uninstallMonkeyPatchOpenFile: () => void;
	uninstallMonkeyPatchOpenLinkText: () => void;

	async onload() {
		console.log('loading ' + this.manifest.name + ' plugin');
		await this.loadSettings();

		this.addSettingTab(new OpenerSettingTab(this.app, this));
		this.addMetaKeyListeners();
		this.monkeyPatchopenFile();
		this.monkeyPatchopenLinkText();
		this.addCommand({
			id: "open-graph-view-in-new-tab",
			name: "Open Graph View in new tab",
			callback: () => {
				// @ts-ignore
				this.app.commands.executeCommandById("workspace:new-tab");
				// @ts-ignore
				this.app.commands.executeCommandById("graph:open");
			},
		});
	}


	onunload(): void {
		this.uninstallMonkeyPatchOpenFile && this.uninstallMonkeyPatchOpenFile();
		this.uninstallMonkeyPatchOpenLinkText && this.uninstallMonkeyPatchOpenLinkText();
		this.removeMetaKeyListeners();
		console.log('unloading ' + this.manifest.name + ' plugin');
	}

	async loadSettings() {
		// At first startup, `data` is `null` because data.json does not exist.
		const data = (await this.loadData()) as OpenerSetting | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Meta key listeners
	// arrow syntax to preserve `this` context
	keyDownHandler = (e: KeyboardEvent) => {
		if (e.key === 'Meta' || e.key === 'Control') {
			this.isMetaKeyHeld = true;
		}
	}
	keyUpHandler = (e: KeyboardEvent) => {
		if (e.key === 'Meta' || e.key === 'Control') {
			this.isMetaKeyHeld = false;
		}
	}
	// Mouse handler is needed because the key handler will not fire if the app is out of focus
	mouseDownHandler = (e: MouseEvent) => {
		if (e.metaKey || e.ctrlKey) {
			this.isMetaKeyHeld = true;
		} else {
			this.isMetaKeyHeld = false;
		}
	}
	addMetaKeyListeners() {
		document.addEventListener('keydown', this.keyDownHandler);
		document.addEventListener('keyup', this.keyUpHandler);
		document.addEventListener('mousedown', this.mouseDownHandler, { capture: true });
	}
	removeMetaKeyListeners() {
		document.removeEventListener('keydown', this.keyDownHandler);
		document.removeEventListener('keyup', this.keyUpHandler);
		document.removeEventListener('mousedown', this.mouseDownHandler, { capture: true });
	}

	monkeyPatchopenFile() {

		// TODO
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const parentThis = this;
		this.uninstallMonkeyPatchOpenFile = around(WorkspaceLeaf.prototype, {
			openFile(oldopenFile) {
				return async function (file: TFile, openState?: OpenViewState) {
					// console.log("new open file");
					const ALLEXT = ['png', 'webp', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'mp3', 'webm', 'wav', 'm4a', 'ogg', '3gp', 'flac', 'mp4', 'ogv', 'mov', 'mkv'];
					const OBSID_OPENABLE = ALLEXT.concat(['md', 'canvas', 'pdf']);
					// console.log("open file run")
					if (
						((parentThis.settings.PDFApp && file.extension == 'pdf')
							|| (parentThis.settings.allExt && ALLEXT.includes(file.extension))
							|| (parentThis.settings.custExt && parentThis.settings.custExtList.includes(file.extension))
							|| (!OBSID_OPENABLE.includes(file.extension) && (!parentThis.settings.custExtIn || (parentThis.settings.custExtIn && !parentThis.settings.custExtInList.includes(file.extension))))
						)
						&& (!parentThis.settings.extOnlyWhenMetaKey || parentThis.isMetaKeyHeld)
					) {
						// @ts-ignore
						app.openWithDefaultApp(file.path);
						// console.log("open w default");
						return;
					}

					// defer to default behavior if:
					// - clicking on link with same path as active file in view (ie headings, blocks, etc). file.path is thing being opened. app.workspace.getActiveFile()?.path is currently opened tab filepath.
					// - mode is preview (eg. hover editor, excalidraw, embeddings, etc) see issue #5
					// - tab is linked to another tab (group), see issue #9
					let openElsewhere = false;
					const sameFile = file.path == app.workspace.getActiveFile()?.path;
					const previewMode = openState?.state?.mode === 'preview';
					if (sameFile || previewMode || this.group) {
						oldopenFile && oldopenFile.apply(this, [file, openState]);
						return;
					}

					else if (parentThis.settings.newTab && !sameFile) {
						// console.log("not same file");
						// else if already open in another tab, switch to that tab
						app.workspace.iterateRootLeaves((leaf: WorkspaceLeaf) => {
							// if (leaf.getViewState().state?.file == file.name) {
							// leaf.getViewState().state?.file = 'Folder/folder note.md' (if it's within a folder). this will not match with file.name
							// console.log(file.path);
							// if (leaf.getViewState().state?.file?.endsWith(file.name)) { //this works. but also:
							if (leaf.getViewState().state?.file == (file.path) && leaf.getViewState().type != 'canvas') {
								// console.log(leaf.getViewState().state?.file);
								// console.log('bruv');
								oldopenFile && oldopenFile.apply(leaf, [file, openState]);
								openElsewhere = true;
								// console.log("openElsewhere: ",openElsewhere);
								// return;
							}
						});


						// else open in new tab


						if (!openElsewhere && parentThis.settings.newTab && !sameFile) {

							// if there's already an empty leaf, pick that one

							const emptyLeaves = app.workspace.getLeavesOfType('empty');
							// console.log("emptyLeaves: ", emptyLeaves.length);
							if (emptyLeaves.length > 0) {
								// console.log("emptyLeaves.length > 0");
								// console.log(emptyLeaves[0]);
								oldopenFile &&
									oldopenFile.apply(emptyLeaves[0], [file, openState]);
								return;
							}
							else if (emptyLeaves.length <= 0) {
								// console.log("emptyLeaves.length <= 0");
								oldopenFile &&
									oldopenFile.apply(this.app.workspace.getLeaf('tab'), [
										file,
										openState,
									]);
								return;
							}
						}
					}

					// default behavior
					else if (!parentThis.settings.newTab) {
						// console.log("default");
						oldopenFile && oldopenFile.apply(this, [file, openState]);
						return;
					}
				};
			},
		});
	}

	// if note already exists, monkeyPatchopenFile() does its job and moves to that one. but openLinkText() with options selected for new tab (invoked via Right Click > Open in New Tab or Quick Switcher Cmd+Enter, etc) will still open a new tab.
	monkeyPatchopenLinkText() {
		let parentThis = this;
		this.uninstallMonkeyPatchOpenLinkText = around(Workspace.prototype, {
			openLinkText(oldOpenLinkText) {
				return async function (
					linkText: string,
					sourcePath: string,
					newLeaf?: PaneType | boolean,
					openViewState?: OpenViewState
				) {
					if (this.activeLeaf?.group) {
						// if in a group (linked tab)
						// do nothing (revert to default behavior)
						// this way ctrl/cmd + click still opens a new tab
					} else if (newLeaf == 'tab' || newLeaf == true) {
						newLeaf = false;
					} else {
						app.workspace.iterateRootLeaves((leaf: WorkspaceLeaf) => {
							if (leaf.getViewState().state?.file == (sourcePath)) {
								newLeaf = false;
							}
						})
					}
					oldOpenLinkText &&
						oldOpenLinkText.apply(this, [
							linkText,
							sourcePath,
							newLeaf,
							openViewState,
						]);
				};
			},
		});
	}

}
