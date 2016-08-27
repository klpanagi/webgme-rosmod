/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Generated by PluginGenerator 0.14.0 from webgme on Tue Apr 12 2016 13:46:59 GMT-0500 (CDT).
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'text!./metadata.json',
    'common/util/ejs', // for ejs templates
    'common/util/xmljsonconverter', // used to save model as json
    'plugin/GenerateDocumentation/GenerateDocumentation/Templates/Templates', // 
    'rosmod/meta',
    'rosmod/remote_utils',
    'rosmod/modelLoader',
    'q'
], function (
    PluginConfig,
    PluginBase,
    pluginMetadata,
    ejs,
    Converter,
    TEMPLATES,
    MetaTypes,
    utils,
    loader,
    Q) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of GenerateDocumentation.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin GenerateDocumentation.
     * @constructor
     */
    var GenerateDocumentation = function () {
        // Call base class' constructor.
        PluginBase.call(this);
	this.pluginMetadata = pluginMetadata;
        this.metaTypes = MetaTypes;
        this.FILES = {
            'conf': 'conf.py.ejs'
        };
    };

    GenerateDocumentation.metadata = pluginMetadata;

    // Prototypal inheritance from PluginBase.
    GenerateDocumentation.prototype = Object.create(PluginBase.prototype);
    GenerateDocumentation.prototype.constructor = GenerateDocumentation;

    GenerateDocumentation.prototype.notify = function(level, msg) {
	var self = this;
	var prefix = self.projectId + '::' + self.projectName + '::' + level + '::';
	var max_msg_len = 100;
	if (level=='error')
	    self.logger.error(msg);
	else if (level=='debug')
	    self.logger.debug(msg);
	else if (level=='info')
	    self.logger.info(msg);
	else if (level=='warning')
	    self.logger.warn(msg);
	self.createMessage(self.activeNode, msg, level);
	if (msg.length < max_msg_len)
	    self.sendNotification(prefix+msg);
	else {
	    var splitMsgs = utils.chunkString(msg, max_msg_len);
	    splitMsgs.map(function(splitMsg) {
		self.sendNotification(prefix+splitMsg);
	    });
	}
    };

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    GenerateDocumentation.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this;

        // Default fails
        self.result.success = false;

	// What did the user select for our configuration?
	var currentConfig = self.getCurrentConfig();
	self.returnZip = currentConfig.returnZip;
	self.runningOnClient = false;

        if (typeof WebGMEGlobal !== 'undefined') {
	    self.runningOnClient = true;
	    callback(new Error('Cannot run ' + self.getName() + ' in the browser!'), self.result);
	    return;
        }
	
        self.updateMETA(self.metaTypes);

	var path = require('path');

	// the active node for this plugin is project
	var projectNode = self.activeNode;
	self.projectName = self.core.getAttribute(projectNode, 'name');
	// Setting up variables that will be used by various functions of this plugin
	self.gen_dir = path.join(process.cwd(),
				 'generated',
				 self.project.projectId,
				 self.branchName,
				 self.projectName,
				 'manual');

	self.projectModel = {}; // will be filled out by loadProjectModel (and associated functions)

	loader.logger = self.logger;
	utils.logger = self.logger;
      	loader.loadModel(self.core, projectNode, true)
  	    .then(function (projectModel) {
		self.projectModel = projectModel.root;
                self.objectDict = projectModel.objects
  	    })
	    .then(function () {
		return self.generateArtifacts();
	    })
	    .then(function () {
		return self.buildDocs();
	    })
	    .then(function () {
		return self.createZip();
	    })
	    .then(function () {
        	self.result.setSuccess(true);
        	callback(null, self.result);
	    })
	    .catch(function (err) {
		self.notify('error', err);
        	self.result.setSuccess(false);
        	callback(err, self.result);
	    })
		.done();
    };

    GenerateDocumentation.prototype.generateArtifacts = function() {
	var self = this;
	var child_process = require('child_process');

	self.notify('info', 'Generating Artifacts.');

	// clear out any previous project files
	child_process.execSync('rm -rf ' + utils.sanitizePath(self.gen_dir));

	var paths = Object.keys(self.objectDict);
	var tasks = paths.map(function(path) {
	    var obj = self.objectDict[path];
	    if (obj.type != 'Documentation')
		return self.generateObjectDocumentation(obj);
	});
	tasks.push(self.generateObjectDocumentation(self.projectModel));
	return Q.all(tasks)
	    .then(function() {
		return self.writeTemplate();
	    })
	    .then(function() {
		return self.copyStatic();
	    })
	    .then(function() {
		self.notify('info', 'Generated Artifacts');
	    });
    };

    GenerateDocumentation.prototype.writeTemplate = function() {
	var self = this;
	var path = require('path');
	var filendir = require('filendir');
	var filesToAdd = {};
	var prefix = 'src';
	var configTemplate = TEMPLATES[self.FILES['conf']];
	var configName = prefix + '/conf.py';
	filesToAdd[configName] = ejs.render(configTemplate, {
	    'projectName': self.projectName,
	    'masterDoc' : self.pathToFileName(self.projectModel.path),
	    'authors' : self.projectModel.Authors
	});
	var fileNames = Object.keys(filesToAdd);
	var tasks = fileNames.map(function(fileName) {
	    var deferred = Q.defer();
	    var data = filesToAdd[fileName];
	    filendir.writeFile(path.join(self.gen_dir, fileName), data, function(err) {
		if (err) {
		    deferred.reject(err);
		}
		else {
		    deferred.resolve();
		}
	    });
	    return deferred.promise;
	});

	return Q.all(tasks)
	    .then(function() {
		var msg = 'Wrote config.';
		self.notify('info', msg);
	    });
    };

    GenerateDocumentation.prototype.copyStatic = function() {
	var self = this;
	var fs = require('fs');
	var path = require('path');
	var unzip = require('unzip');
	var fstream = require('fstream');

	var deferred = Q.defer();

	var staticFile = path.join(process.cwd(), 'src/plugins/GenerateDocumentation/static.zip');
	var readStream = fs.createReadStream(staticFile);
	
	var writeStream = fstream.Writer(self.gen_dir);
	if (writeStream == undefined) {
	    throw new String('Couldn\'t open '+self.gen_dir);
	}

	writeStream.on('unpipe', () => { deferred.resolve(); } );

	readStream
	    .pipe(unzip.Parse())
	    .pipe(writeStream);
	return deferred.promise;
    };

    GenerateDocumentation.prototype.pathToFileName = function(path) {
	var self = this;
	return self.projectName.replace(/ /g,'_').toLowerCase() + path.replace(/\//g, '_');
    };

    GenerateDocumentation.prototype.addToC = function(obj, str) {
	var self = this;
	str += '\n.. toctree::\n    :includehidden:\n    :maxdepth: 2\n\n';
	obj.childPaths.map(function(childPath) {
	    str += '    '+self.pathToFileName(childPath) + '\n';
	});
	return str;
    };

    GenerateDocumentation.prototype.generateObjectDocumentation = function(obj) {
	var self = this;
	var path = require('path');
	var fs = require('fs');
	var child_process=  require('child_process');
	var filendir = require('filendir');

	var deferred = Q.defer();

	var prefix = 'src';

	if (obj.Documentation_list) {
	    obj.Documentation_list.map(function(documentation) {
		// do something with docs here
		if (documentation.documentation) {
		    var filePath = path.join(self.gen_dir, prefix, self.pathToFileName(obj.path) + '.rst');
		    var srcPath = path.join(self.gen_dir, prefix, self.pathToFileName(obj.path) + '.md');
		    var result = '';
		    var pandoc = child_process.spawn('pandoc', ['-f','markdown','-t','rst']);
		    pandoc.stdout.on('data', function(data) {
			result += data + '';
		    });
		    pandoc.stdout.on('end', function() {
			result = self.addToC(obj, result);
			filendir.writeFile(filePath, result, function (err) {
			    if (err) {
				deferred.reject('Writing file failed: ' + err);
			    }
			    else {
				filendir.writeFile(srcPath, documentation.documentation, function (err) {
				    if (err) {
					deferred.reject('Writing src failed: ' + err);
				    }
				    else {
					deferred.resolve();
				    }
				});
			    }
			});
		    });
		    pandoc.stderr.on('data', function(err) {
			deferred.reject('Conversion with pandoc failed: ' + err);
		    });
		    pandoc.stdin.end(documentation.documentation, 'utf-8');
		}
		else {
		    deferred.resolve();
		}
	    });
	}
	else {
	    deferred.resolve();
	}
	return deferred.promise;
    };

    GenerateDocumentation.prototype.buildDocs = function() {
	var self = this;

	self.notify('info', 'Building docs into HTML and PDF');

	var deferred = Q.defer();
	var terminal=  require('child_process').spawn('bash', [], {cwd:self.gen_dir});
	terminal.stdout.on('data', function (data) {});
	terminal.stderr.on('data', function (error) {
	});
	terminal.on('exit', function(code) {
	    if (code == 0) {
		deferred.resolve(code);
	    }
	    else {
		deferred.reject('buildDocs:: child process exited with code ' + code);
	    }
	});
	var pdfName = self.projectName.replace(/ /g, '') + '.pdf';
	setTimeout(function() {
	    terminal.stdin.write('make\n');
	    terminal.stdin.write('make pdf\n');
	    terminal.stdin.write('mv ./build/html .\n');
	    terminal.stdin.write('mv ./build/pdf/'+pdfName+' .\n');
	    terminal.stdin.write('rm -rf ./build/pdf/\n');
	    terminal.stdin.write('rm -rf ./build\n');
	    terminal.stdin.end();
	}, 1000);
	return deferred.promise;
    };

    GenerateDocumentation.prototype.createZip = function() {
	var self = this;
	
	if (!self.returnZip || self.runningOnClient) {
            self.notify('info', 'Skipping compression.');
	    return;
	}

	self.notify('info', 'Starting compression.');
	
	return new Promise(function(resolve, reject) {
	    var zlib = require('zlib'),
	    tar = require('tar'),
	    fstream = require('fstream'),
	    input = self.gen_dir;

	    var bufs = [];
	    var packer = tar.Pack()
		.on('error', function(e) { reject(e); });

	    var gzipper = zlib.Gzip()
		.on('error', function(e) { reject(e); })
		.on('data', function(d) { bufs.push(d); })
		.on('end', function() {
		    var buf = Buffer.concat(bufs);
		    var name = self.projectName + '+Documentation';
		    self.blobClient.putFile(name+'.tar.gz',buf)
			.then(function (hash) {
			    self.result.addArtifact(hash);
			    resolve();
			})
			.catch(function(err) {
			    reject(err);
			})
			    .done();
		});

	    var reader = fstream.Reader({ 'path': input, 'type': 'Directory' })
		.on('error', function(e) { reject(e); });

	    reader
		.pipe(packer)
		.pipe(gzipper);
	})
	    .then(function() {
		self.notify('info', 'Created archive.');
	    });
    };

    return GenerateDocumentation;
});
