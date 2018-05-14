/*globals define*/
/*eslint-env node, browser*/

/**
 * Generated by PluginGenerator 2.16.0 from webgme on Thu May 10 2018 09:02:07 GMT-0500 (CDT).
 * A plugin that inherits from the PluginBase. To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'remote-utils/remote-utils',
    'webgme-to-json/webgme-to-json',
    'rosmod/processor',
    'q'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase,
    utils,
    webgmeToJson,
    processor,
    Q) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of InstallRuntime.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin InstallRuntime.
     * @constructor
     */
    var InstallRuntime = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    InstallRuntime.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    InstallRuntime.prototype = Object.create(PluginBase.prototype);
    InstallRuntime.prototype.constructor = InstallRuntime;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    InstallRuntime.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this;

        // Default fails
        self.result.success = false;        self.updateMETA({});

        // What did the user select for our configuration?
        var currentConfig = self.getCurrentConfig();
        // get the selected hosts from the config
        // also get the ordered nodes from the config
        self.selectedHostConfig = {};
        var disabledHostMessage = 'Do not install on this host';
        Object.keys(currentConfig).map(function(k) {
            if (k.indexOf('Host_User_Selection:') > -1) {
                var hostPath = k.split(':')[1];
                var selectedUser = currentConfig[k];
                if (!self.selectedHostConfig[ hostPath ]) {
                    self.selectedHostConfig[ hostPath ] = { user: '', enabled: false, path: '' };
                }
                if (selectedUser != disabledHostMessage) {
                    self.selectedHostConfig[ hostPath ].user = selectedUser;
                    self.selectedHostConfig[ hostPath ].enabled = true;
                }
            } else if (k.indexOf('Host_Install_Selection:') > -1) {
                var hostPath = k.split(':')[1];
                var installPath = currentConfig[k];
                if (!self.selectedHostConfig[ hostPath ]) {
                    self.selectedHostConfig[ hostPath ] = { user: '', enabled: false, path: '' };
                }
                self.selectedHostConfig[ hostPath ].path = installPath;
            }
        });

        // set up libraries
        webgmeToJson.notify = function(level, msg) {self.notify(level, msg);}
        utils.notify = function(level, msg) {self.notify(level, msg);}
        utils.trackedProcesses = ['catkin', 'rosmod_actor', 'roscore'];

        // the active node for this plugin is system -> systems -> project
        var systemName = self.core.getAttribute(self.activeNode, 'name');
        
        webgmeToJson.loadModel(self.core, self.rootNode, self.activeNode, true, true)
            .then(function(projectModel) {
                processor.processModel(projectModel);
                self.projectModel = projectModel.root;
                self.objectDict = projectModel.objects;
                // check to make sure we have the right experiment
                var expPath = self.core.getPath(self.activeNode);
                self.selectedExperiment = self.objectDict[expPath];
                if (!self.selectedExperiment) {
                    throw new String("Cannot find experiment!");
                }
                return self.mapContainersToHosts();
            })
            .then(function() {
                // send the deployment + binaries off to hosts for execution
                self.notify('info','deploying onto system');
                return self.deployExperiment();
            })
            .then(function () {
                self.result.setSuccess(true);
                callback(null, self.result);
            })
            .catch(function(err) {
                if (typeof err !== 'string')
                    err = new String(err);
                self.notify('error', err);
                self.result.setSuccess(false);
                callback(err, self.result);
            })
                .done();
    };

    return InstallRuntime;
});
