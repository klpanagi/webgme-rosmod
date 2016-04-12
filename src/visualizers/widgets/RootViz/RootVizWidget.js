/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * Generated by VisualizerGenerator 0.1.0 from webgme on Wed Mar 16 2016 12:18:29 GMT-0700 (PDT).
 */

define([
    'text!./RootViz.html',
    'js/DragDrop/DragHelper',
    'js/Widgets/ModelEditor/ModelEditorWidget',
    'common/util/ejs',
    './Buttons',
    './Templates',
    'css!./styles/RootVizWidget.css'
], function (
    RootVizHtml,
    DragHelper,
    ModelEditorWidget,
    ejs,
    Buttons,
    TEMPLATES) {
    'use strict';

    var RootVizWidget,
        WIDGET_CLASS = 'root-viz';

    RootVizWidget = function (logger, container, params) {
        this._logger = logger.fork('Widget');

	params = params || {};
	params.tabsEnabled = false;
	params.addTabs = false;
	params.deleteTabs = false;
	params.reorderTabs = false;
	params.droppable = true;
	params.zoomvalues = [0.1,0.5,1.0,1.5,2.0];

	ModelEditorWidget.call(this, container, params);

        this.$el = container;

        this.nodes = {};

        this._initialize();

        this._logger.debug('ctor finished');
    };

    _.extend(RootVizWidget.prototype, ModelEditorWidget.prototype);

    RootVizWidget.prototype._initialize = function () {
        // set widget class
        this.$el.addClass(WIDGET_CLASS);
        this.$el.append(RootVizHtml);

	this._nodes = [];
	this._numNodes = 0;
	this._currentRow = 0;
	this._tableSetup = false;
    };

    RootVizWidget.prototype.onWidgetContainerResize = function (width, height) {
	/*
	this._logger.error('RESIZING:: ' + width + ' ' + height);
	this._initialize(width);
	this._nodes.map(function(desc) {
	    this.createNodeEntry(desc);
	});
	*/
    };

    RootVizWidget.prototype.setupTable = function() {
	var sizeOfElement = 300;
        var width = this.$el.width(),
            height = this.$el.height();
	this._numElementsPerRow = Math.floor(width / sizeOfElement);
	var table = this.$el.find('#rootVizTable');
	table.empty();
	table.append('<colgroup>');
	for (var i=0;i<this._numElementsPerRow;i++)
	    table.append('<col width="'+100/this._numElementsPerRow+'%" height="auto">');
	table.append('</colgroup>');
	this._tableSetup = true;
    };

    RootVizWidget.prototype.createNodeEntry = function (desc) {
	var table,
	row,
	column,
	projectHtml,
	panelId,
	title,
	authors,
	brief,
	detailed,
	htmlId,
	html;
	
	if (!this._tableSetup)
	    this.setupTable();

	if ((this._numNodes % this._numElementsPerRow) == 0) {
	    this._currentRow++;
	    table = this.$el.find('#rootVizTable');
	    table.append('<tr id="rowClass'+this._currentRow+'"></tr>');
	}
	row = this.$el.find('#rowClass' + this._currentRow);
	row.append('<td style="vertical-align: top" id="colClass'+this._numNodes+'"></td>');
	column = this.$el.find('#colClass' + this._numNodes);

	title = desc.name;
	panelId = title.replace(/ /g,'-');
	authors = desc.authors;
	brief = desc.brief;
	detailed = desc.detailed;
	projectHtml = ejs.render(TEMPLATES['Project.html.ejs'], {
	    id: panelId,
	    title: title,
	    authors: authors,
	    brief: brief,
	    detailed: detailed
	});

	column.append(projectHtml);

	htmlId = panelId + '-node-panel';
	html = this.$el.find('#' + htmlId);

	html.addClass('panel-info');
	html.on('mouseenter', (event) => {
	    html.addClass('panel-primary');
	    html.removeClass('panel-info');
	});
	html.on('mouseleave', (event) => {
	    html.addClass('panel-info');
	    html.removeClass('panel-primary');
	});
	html.on('click', (event) => {
	    this.onNodeClick(desc.id);
	    event.stopPropagation();
	    event.preventDefault();
	});
	this._numNodes++;
    };

    // Adding/Removing/Updating items
    var NODE_WHITELIST = {
        Project: true
    };
    RootVizWidget.prototype.addNode = function (desc) {

        if (desc) {
	    var isValid = NODE_WHITELIST[desc.meta];

            if (isValid) {
		//this._nodes.push(desc);
		this.createNodeEntry(desc);
            }
        }
    };

    RootVizWidget.prototype.removeNode = function (gmeId) {
	if (this.nodes[gmeId]) {
            delete this.nodes[gmeId];
	}
    };

    RootVizWidget.prototype.updateNode = function (desc) {
    };

    /* * * * * * * * Visualizer event handlers * * * * * * * */

    RootVizWidget.prototype.onNodeClick = function (id) {
        // This currently changes the active node to the given id and
        // this is overridden in the controller.
    };

    RootVizWidget.prototype.onBackgroundDblClick = function () {
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    RootVizWidget.prototype.destroy = function () {
    };

    RootVizWidget.prototype.onActivate = function () {
    };

    RootVizWidget.prototype.onDeactivate = function () {
    };

    return RootVizWidget;
});
