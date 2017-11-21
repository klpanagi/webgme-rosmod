/*globals define, WebGMEGlobal*/
/**
 * Example of custom plugin configuration. Typically a dialog would show up here.
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/Dialogs/PluginConfig/PluginConfigDialog'
], function (
    PluginConfigDialog) {
    'use strict';

    function ConfigWidget(params) {
        this._client = params.client;
        this._logger = params.logger.fork('ConfigWidget');
    }

    /**
     * Called by the InterpreterManager if pointed to by metadata.configWidget.
     * You can reuse the default config by including it from 'js/Dialogs/PluginConfig/PluginConfigDialog'.
     *
     * @param {object[]} globalConfigStructure - Array of global options descriptions (e.g. runOnServer, namespace)
     * @param {object} pluginMetadata - The metadata.json of the the plugin.
     * @param {object} prevPluginConfig - The config at the previous (could be stored) execution of the plugin.
     * @param {function} callback
     * @param {object|boolean} callback.globalConfig - Set to true to abort execution otherwise resolved global-config.
     * @param {object} callback.pluginConfig - Resolved plugin-config.
     * @param {boolean} callback.storeInUser - If true the pluginConfig will be stored in the user for upcoming execs.
     *
     */
    ConfigWidget.prototype.show = function (globalConfigStructure, pluginMetadata, prevPluginConfig, callback) {
        var pluginConfig = JSON.parse(JSON.stringify(prevPluginConfig)), // Make a copy of the prev config
            globalConfig = {},
            activeNodeId = WebGMEGlobal.State.getActiveObject(),
            activeNode;

        // Need to add:
        // * host drop-down to sleect where to run ROSCORE
        // * of the available hosts, which ones we will select for this experiment


        // Need to make dynamic:
        // * drag/drop list for ordered starting of containers / processes
        // * ROSCore location and port number if the user selects to automatically start ROSCore
        // * Per host - which user to run the experiment as (with the default chosen)

        var pluginDialog = new PluginConfigDialog({client: this._client});
        pluginDialog.show(globalConfigStructure, pluginMetadata, prevPluginConfig, callback);

        /*
        // We use the default global config here..
        globalConfigStructure.forEach(function (globalOption) {
            globalConfig[globalOption.name] = globalOption.value;
        });

        if (typeof activeNodeId === 'string') {
            activeNode = this._client.getNode(activeNodeId);
            pluginConfig.activeNodeName = activeNode.getAttribute('name');
        } else {
            this._logger.error('No active node...');
            callback(true); // abort execution
            return;
        }

        callback(globalConfig, pluginConfig, false); // Set third argument to true to store config in user.
        */
    };

    return ConfigWidget;
});
