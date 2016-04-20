/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * Generated by VisualizerGenerator 0.1.0 from webgme on Wed Apr 06 2016 14:15:27 GMT-0500 (CDT).
 */

define([
    'text!./Plot.html',
    'rosmod/Libs/flot/jquery.flot',
    'rosmod/Libs/flot/jquery.flot.navigate',
    'rosmod/Libs/flot/jquery.flot.selection',
    'css!./styles/ResultsVizWidget.css'
], function (
    PlotHtml, 
    flot, 
    flotNavigate,
    flotSelection) {
    'use strict';

    var ResultsVizWidget,
        WIDGET_CLASS = 'results-viz';

    ResultsVizWidget = function (logger, container) {
        this._logger = logger.fork('Widget');

        this._el = container;

        this.nodes = {};
        this._initialize();

        this._logger.debug('ctor finished');
    };

    ResultsVizWidget.prototype._initialize = function () {
        var width = this._el.width(),
            height = this._el.height(),
            self = this;

        // set widget class
        this._el.addClass(WIDGET_CLASS);
    };

    ResultsVizWidget.prototype.onWidgetContainerResize = function (width, height) {
        console.log('Widget is resizing...');
    };

    // Adding/Removing/Updating items
    ResultsVizWidget.prototype.addNode = function (desc) {
        if (desc) {
	    for (var a in desc.attributes) {
		// setup the html
		this._el.append(PlotHtml);
		var container = this._el.find('#log');
		$(container).attr('id', 'log_'+a);
		
		var title = this._el.find('#title');
		$(title).attr('id','title_'+a);

		var p = this._el.find('#plot');
		$(p).attr('id',"plot_" + a);

		var choices = this._el.find('#choices');
		$(choices).attr('id','choices_'+a);

		// parse the logs
		var re = /ROSMOD::(\w+)::([\d]*)::((?:CALLBACK COMPLETED)|(?:CALLBACK FIFO ENQUEUE) ?)*::Alias=(\w+); (?:(?:[\w=;, ]*Enqueue Time)|(?:Completion Time)) sec=(\d*), nsec=(\d*)/gi;
		var result = re.exec(desc.attributes[a]);
		var log_data = {};
		var first_time = 0.0;
		var max_exec_time = 0.0;
		if (result != null)
		    var first_time = parseInt(result[5]) + result[6]/1000000000.0;
		while(result != null) {
		    var alias = result[4];
		    if (!log_data[alias]) {
			log_data[alias] = {
			    data : [],
			    enqueue_times: [],
			    completion_times: []
			};
		    }
		    if (result[3].indexOf('ENQUEUE') > -1) {
			var enqueue_time = parseInt(result[5]) + result[6]/1000000000.0;
			log_data[alias].enqueue_times.push(enqueue_time);
			if (first_time == 0.0)
			    first_time = enqueue_time;
		    }
		    else if (result[3].indexOf('COMPLETED') > -1) {
			var completion_time = parseInt(result[5]) + result[6]/1000000000.0;
			log_data[alias].completion_times.push(completion_time);
		    }
		    if ( log_data[alias].completion_times.length > 0 && log_data[alias].enqueue_times.length > 0 ) {
			// at this point there can only be one completion_time, though there may be multiple enqueue times
			var comp = log_data[alias].completion_times[0];
			var enq = log_data[alias].enqueue_times[0];
			var exec_time = comp - enq;
			if (exec_time > max_exec_time)
			    max_exec_time = exec_time;
			log_data[alias].data.push([enq - first_time,  0]);
			log_data[alias].data.push([enq - first_time,  exec_time]);
			log_data[alias].data.push([comp - first_time, exec_time]);
			log_data[alias].data.push([comp - first_time, 0]);
			// remove the currently processed enqueue / completion time
			log_data[alias].enqueue_times = log_data[alias].enqueue_times.slice(1);
			log_data[alias].completion_times = log_data[alias].completion_times.slice(1);
		    }
		    result = re.exec(desc.attributes[a]);
		}
		var plot_data = {};
		var aliases = Object.keys(log_data);
		var i = 0;
		aliases.map(function(alias) {
		    $(choices).append(
			"<br/><input type='checkbox' name='"+alias + "' checked='checked' id ='id"+alias + "'></input>" +
			    "<label for='id"+alias + "'>" + alias + "</label>"
		    );
		    plot_data[alias] = {
			label: alias,
			data: log_data[alias].data,
			color: i
		    };
		    i++;
		});

		var plotAccordingToChoices = function(attr, cont, data) {
		    return function() {

			var plottedData = [];

			$('#choices_'+attr).find('input:checked').each(function() {
			    var key = $(this).attr('name');
			    if (key && data[key]) {
				plottedData.push(data[key]);
			    }
			});
			
			if (plottedData.length > 0) {
			    $.plot($("#plot_" + attr), plottedData, {
				legend: {
				    show: true,
				    position: "ne",
				    sorted: "ascending"
				},
				zoom: {
				    interactive: true
				},
				pan: {
				    interactive: true
				},
				series: {
				    lines: { show: true },
				    points: { show: false }
				},
				grid: {
				    borderWidth: 1,
				    minBorderMargin: 20,
				    labelMargin: 10,
				    backgroundColor: {
					colors: ["#fff", "#e4f4f4"]
				    },
				    margin: {
					top: 1,
					bottom: 20,
					left: 20
				    }
				},
				xaxis: {
				    labelWidth: 30
				},
				yaxis: {
				    labelWidth: 30
				}
			    });
			    var xaxisLabel = $("<div class='axisLabel xaxisLabel'></div>")
				.text("Experiment Time").appendTo($('#plot_' + attr));
			    var yaxisLabel = $("<div class='axisLabel yaxisLabel'></div>")
				.text("Operation Execution Time (s)").appendTo($('#plot_' + attr));
			    yaxisLabel.css("margin-top", yaxisLabel.width() / 2 - 20);
			}
			else {
			    $('#plot_'+a).detach();
			}
		    };
		}(a, container, plot_data); // bind the arguments so they're saved for later

		// bind events for plots and choices
		choices.click(plotAccordingToChoices);

		plotAccordingToChoices();
	    }

            this.nodes[desc.id] = desc;
        }
    };

    ResultsVizWidget.prototype.removeNode = function (gmeId) {
        var desc = this.nodes[gmeId];
        this._el.append('<div>Removing node "'+desc.name+'"</div>');
        delete this.nodes[gmeId];
    };

    ResultsVizWidget.prototype.updateNode = function (desc) {
        if (desc) {
            console.log('Updating node:', desc);
            this._el.append('<div>Updating node "'+desc.name+'"</div>');
        }
    };

    /* * * * * * * * Visualizer event handlers * * * * * * * */

    ResultsVizWidget.prototype.onNodeClick = function (id) {
        // This currently changes the active node to the given id and
        // this is overridden in the controller.
    };

    ResultsVizWidget.prototype.onBackgroundDblClick = function () {
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    ResultsVizWidget.prototype.destroy = function () {
    };

    ResultsVizWidget.prototype.onActivate = function () {
        console.log('ResultsVizWidget has been activated');
    };

    ResultsVizWidget.prototype.onDeactivate = function () {
        console.log('ResultsVizWidget has been deactivated');
    };

    return ResultsVizWidget;
});
