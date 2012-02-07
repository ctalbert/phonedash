/*
TODO: this code needs some *serious* refactoring.
    - Received suggestion to use knockout.js to bind ui changes to changes in your data model: http://knockoutjs.com/
*/
function show_loading(){
  //Clear the display divs and show loading gif
  $('#content-main').html("<div id='loading' style='margin:0 auto; padding-top:20px;'><center><span style='font-weight:200; font-size:200%;'>Loading...</span><br/><img height='32' width='32' src='./assets/images/loading.gif' alt='' /></center></div>");
  $('#errors').html("");
  $('#container').html("");
  $('#container2').html("");
  $('#container3').html("");
  $('#container-run').html("");
  $('#container-load').html("");
}

function hide_loading(){
  //Hide loading div after page loads
  $('#loading').html("")
}

/*TODO: ughhhhh you have to make charts like:
  Linux - Run Time - SimpleTest.js
  Windows - Load Time - EventUtils.js

  you can't shove them all in rungraph_data, since it will use all the datapoints as valid data, even if they're unrelated. That's why you see so many points that have 0 as their run/load times; it's because you have lots of data points but they're not being filtered on type/name. They need their own dataset to be shoved into
 */
function show_charts(params, names){ 
  //Testperf Charts (DiskIOs and Pagefaults)
  show_loading(); //Show loading div to keep user happy
  //TODO: remove
  if (typeof(names) == 'undefined') {
    names = {};
  }

  //Build Resource URL
  var resourceURL = 'api/perfdata/?' + 
    Object.keys(params).filter(function(name) {
      return (params[name] !== "any");
    }).map(function(name) {
      return name + "=" + params[name];
    }).join("&");

  wgraph_title = "DiskIOs - Writes";
  dgraph_title = "DiskIOs - Reads";
  pgraph_title = "Pagefaults";

  $.getJSON(resourceURL, function(data) {
    //Start by declaring sets to hold our data from the database

    //Data for DiskIO Graph
    dgraph_data = [];
    d_points = [];
    b_points = [];

    //Data for Pagefaults Graph
    pgraph_data = [];
    p_points = [];

    //Data for Writes Graph
    wgraph_data = [];
    w_points = [];
    wb_points = [];

    //Declare diskio and readbytes datasets
    dseries = {'name': 'Disk IOs',
               'data': d_points
              }
    bseries = {'name': 'Disk IO Size',
               'yAxis': 1,
               'data': b_points
              }
 
    //Declare writes and writebytes datasets
    wseries = {'name': 'Writes',
               'data': w_points
              }
    wbseries = {'name': 'Write Size',
                'yAxis': 1,
                'data': wb_points
               }


    //Declare pagefaults dataset
    pseries = {'name': 'Page Faults',
               'data':  p_points,
              }

    //Gather and Group data from the database
    for (var datapoint in data){
      var date = data[datapoint]["date"]
      parseDate = date.split("-");
      year = parseDate[0];
      month = parseDate[1] - 1; //Javascript months index from 0 instead of 1
      day = parseDate[2];

      reads = 0;
      read_bytes = 0;
      writes = 0;
      write_bytes = 0;
      pagefaults = 0;

      for(var item in data[datapoint]["perfdata"]){
        var perfdata = data[datapoint]["perfdata"][item];

        name = perfdata["name"];
        if(perfdata["type"] == "diskIO"){
          //if we did not set a dname
          if(typeof names['dname'] == 'undefined' || names['dname'] == null){
            if(typeof perfdata["reads"] != 'undefined'){
              reads += perfdata["reads"];
              read_bytes += perfdata["read_bytes"];
            }
          }else{
            //if dname is set, add the perfdata if the name matches dname
            if(name == names['dname'] && (typeof perfdata["reads"] != 'undefined')){
              reads += perfdata["reads"];
              read_bytes += perfdata["read_bytes"];
            }
          }
          //if we have wname == name or no name is passed:
          if (typeof names['wname'] == 'undefined' || names['wname'] == null || name == names['wname']){
            if(typeof perfdata["writes"] != 'undefined'){
              writes += perfdata["writes"];
              write_bytes += perfdata["write_bytes"];
            }
          }
        }else if(perfdata["type"] == "pagefaults"){
          //if we have pagefaults and pname==name or no name is given
          if (typeof names['pname'] == 'undefined' || names['pname'] == null || name == names['pname']){
            pagefaults += perfdata["count"];
          }
        }
      }

      //Declare data points using the data
      b_point = [Date.UTC(year, month, day), read_bytes, name];
      b_points.push(b_point);

      d_point = [Date.UTC(year, month, day), reads, name];
      d_points.push(d_point);

      wb_point = [Date.UTC(year, month, day), write_bytes, name];
      wb_points.push(wb_point);
      w_point = [Date.UTC(year, month, day), writes, name];
      w_points.push(w_point);

      p_point = [Date.UTC(year, month, day), pagefaults, name];
      p_points.push(p_point);
    }

    //Push the series into their respective graphs
    wgraph_data.push(wseries);
    wgraph_data.push(wbseries); //Byte size data

    dgraph_data.push(dseries);
    dgraph_data.push(bseries); //Byte size data

    pgraph_data.push(pseries);

    //Loading is complete!
    hide_loading();


    //Begin Line Chart 1
    var chart;
    jQuery(document).ready(function() {
      chart = new Highcharts.Chart({
        chart: {
          renderTo: 'container',
          type: 'spline'
        },
        title: {
          text: 'Testperf - '+dgraph_title
        },
        subtitle: {
          text: ''
        },
        xAxis: {
          type: 'datetime',
          dateTimeLabelFormats: { // don't display the dummy year
            month: '%b %e',
            year: '%Y'
          }
        },
        yAxis: [
          {
            title: {
              text: 'Number'
            },
            min: 0
          },
          {
            title:{
              text: 'Bytes'
            },
            opposite: true
          }
        ],
        tooltip: {
          formatter: function() {
            var unit = {
              'Disk IOs': 'Disk IOs (reads)',
              'Disk IO Size': 'bytes',
            }[this.series.name];

            return ''+
              this.y +' '+ unit;
          }
        },
        series: dgraph_data
      });
    });
    //End Line Chart
    //Begin Line Chart 2
    var chart2;
    jQuery(document).ready(function() {
      chart2 = new Highcharts.Chart({
        chart: {
          renderTo: 'container2',
          type: 'spline'
        },
        title: {
          text: 'Testperf - '+wgraph_title
        },
        subtitle: {
          text: ''
        },
        xAxis: {
          type: 'datetime',
          dateTimeLabelFormats: { // don't display the dummy year
            month: '%b %e',
            year: '%Y'
          }
        },
        yAxis: [
          {
            title: {
              text: 'Number Writes'
            },
            min: 0
          },
          {
            title:{
              text: 'Bytes'
            },
            opposite: true
          }
        ],
        tooltip: {
          formatter: function() {
            var unit = {
              'Writes': 'Disk IOs (writes)',
              'Write Size': 'bytes',
            }[this.series.name];

            return ''+
              this.y +' '+ unit;
          }
        },
        series: wgraph_data
      });
    });
    //End Line Chart

    //Begin Line Chart 3
    var chart3;
    jQuery(document).ready(function() {
      chart3 = new Highcharts.Chart({
        chart: {
          renderTo: 'container3',
          type: 'spline'
        },
        title: {
          text: 'Testperf - '+pgraph_title
        },
        subtitle: {
          text: ''
        },
        xAxis: {
          type: 'datetime',
          dateTimeLabelFormats: { // don't display the dummy year
            month: '%b %e',
            year: '%Y'
          }
        },
        yAxis: {
          title: {
            text: 'Number'
          },
          min: 0
        },
        tooltip: {
          formatter: function() {
            return '<b>'+ this.series.name +'</b><br/>'+
              Highcharts.dateFormat('%b %e, %Y', this.x) +': '+ this.y +' times';
          }
        },
        series: pgraph_data
      });
    });
    //End Line Chart

//Chart is now made, so update DOM:


    $("#container").prepend('<form id="d_nameselector">DiskIO From: <select name="name" id="d_name"><option>none selected</option></select><input type="submit" name="submit" value="Change data"/></form>');
    $("#container3").prepend('<form id="p_nameselector">Process Name: <select name="name" id="p_name"><option>none selected</option></select><input type="submit" name="submit" value="Change data"/></form>');


    //HACK USES GLOBAL VARIABLEs.
    //TODO: Convert to passing with a cookie or something better.
    for(var x in DISKIO_NAMES){
      x = DISKIO_NAMES[x];

      //Here check if dname is set
      if(x == names['dname']){
        $('#d_name').append('<option selected>'+x+'</option>');
      }else{
        $('#d_name').append('<option>'+x+'</option>');
      }
    }
    for(var x in PAGEFAULT_NAMES){
      x = PAGEFAULT_NAMES[x];
      if(x == names['pname']){
        $('#p_name').append('<option selected>'+x+'</option>');
      }else{
        $('#p_name').append('<option>'+x+'</option>');
      }
    }

    //TODO Replace the boilerplate below with one function taking in the dom id and the values parameter
    //Change graph data! When we detect someone is asking for a specific name, do something specific.
    $("#d_nameselector").submit(function(event){
      event.preventDefault(); //Don't actually submit anywhere
      var values = {};
      $.each($('#data-selector').serializeArray(), function(i, field) {
        values[field.name] = field.value;
      });

      var dvalues = {};
      $.each($('#d_nameselector').serializeArray(), function(i, field) {
        dvalues[field.name] = field.value;
      });
      search_name = dvalues["name"];
      names['dname'] = dvalues["name"];
      names['wname'] = dvalues["name"];

      if(search_name != "none selected"){
        //Do something to modify the data
        show_charts(values, names);
      }

    });
    //Change graph data! When we detect someone is asking for a specific name, do something specific.
    $("#p_nameselector").submit(function(event){
      event.preventDefault(); //Don't actually submit anywhere
      var values = {};
      $.each($('#data-selector').serializeArray(), function(i, field) {
        values[field.name] = field.value;
      });

      var pvalues = {};
      $.each($('#p_nameselector').serializeArray(), function(i, field) {
        pvalues[field.name] = field.value;
      });
      search_name = pvalues["name"];

      if(search_name != "none selected"){
        //Do something to modify the data
        names['pname'] = search_name; 
        names['wname'] = names['dname']; //TODO: is this desired??
        //show_charts(values, dname, search_name, dname);
        show_charts(values, names);
      }
    });
  }); //End $.getJSON
}

function show_mochi_charts(params, names){ 
  //Testperf Charts (DiskIOs and Pagefaults)
  show_loading(); //Show loading div to keep user happy
  //TODO: remove
  if (typeof(names) == 'undefined') {
    names = {};
  }

  //Build Resource URL
  var resourceURL = 'api/perfdata/?' + 
    Object.keys(params).filter(function(name) {
      return (params[name] !== "any");
    }).map(function(name) {
      return name + "=" + params[name];
    }).join("&");

  rungraph_title = "RunTime - ms";
  loadgraph_title = "LoadTime - ms";

  $.getJSON(resourceURL, function(data) {
    //Start by declaring sets to hold our data from the database

    //Data for Runtime
    rungraph_data = []
    run_points = [];
    //Data for Loadtime
    loadgraph_data = []
    load_points = [];

    run_series = {'name': 'Run Times',
                  'data': run_points,
                 }
    load_series = {'name': 'Load Times',
                  'data': load_points,
                 }

    //Gather and Group data from the database
    for (var datapoint in data){
      runtime = 0;
      loadtime = 0;
      for(var item in data[datapoint]["perfdata"]){
        var perfdata = data[datapoint]["perfdata"][item];

        name = perfdata["name"];
        if(name == names['rname'] && perfdata["type"] == "RunTime") {
          //display runtime only if given name
        run_point = [parseInt(data[datapoint]["starttime"]) * 1000, perfdata['time'], name];
        run_points.push(run_point);
        }
        else if(name == names['lname']  && perfdata["type"] == "LoadTime") {
          //display loadtime only if given name
        load_point = [parseInt(data[datapoint]["starttime"]) * 1000, perfdata['time'], name];
          load_points.push(load_point);
        }
      }
    }
    rungraph_data.push(run_series);
    loadgraph_data.push(load_series);

    //Loading is complete!
    hide_loading();


    //Begin Line Chart 1
    var chartrun;
    jQuery(document).ready(function() {
      chart = new Highcharts.Chart({
        chart: {
          renderTo: 'container-run',
          type: 'spline'
        },
        title: {
          text: 'Testperf - '+rungraph_title
        },
        subtitle: {
          text: ''
        },
        xAxis: {
          type: 'datetime',
          dateTimeLabelFormats: { // don't display the dummy year
            month: '%b %e',
            year: '%Y'
          }
        },
        yAxis: [
          {
            title: {
              text: 'Milliseconds'
            },
            min: 0
          },
        ],
        tooltip: {
          formatter: function() {
            return '<b>'+ this.series.name +'</b><br/>'+
              Highcharts.dateFormat('%b %e, %Y', this.x) +': '+ this.y +' ms';
          }
        },
        series: rungraph_data
      });
    });
    var chartload;
    jQuery(document).ready(function() {
      chartload = new Highcharts.Chart({
        chart: {
          renderTo: 'container-load',
          type: 'spline'
        },
        title: {
          text: 'Testperf - '+loadgraph_title
        },
        subtitle: {
          text: ''
        },
        xAxis: {
          type: 'datetime',
          dateTimeLabelFormats: { // don't display the dummy year
            month: '%b %e',
            year: '%Y'
          }
        },
        yAxis: [
          {
            title: {
              text: 'Milliseconds'
            },
            min: 0
          },
        ],
        tooltip: {
          formatter: function() {
            return '<b>'+ this.series.name +'</b><br/>'+
              Highcharts.dateFormat('%b %e, %Y', this.x) +': '+ this.y +' ms';
          }
        },
        series: loadgraph_data
      });
    });
    //End Line Chart

//Chart is now made, so update DOM:


    $("#container-run").prepend('<form id="run_nameselector">Test Name: <select name="name" id="run_name"><option>none selected</option></select><input type="submit" name="submit" value="Change data"/></form>');
    $("#container-load").prepend('<form id="load_nameselector">Test Name: <select name="name" id="load_name"><option>none selected</option></select><input type="submit" name="submit" value="Change data"/></form>');


    //HACK USES GLOBAL VARIABLEs.
    //TODO: Convert to passing with a cookie or something better.
    for(var x in RUNTIME_NAMES){
      x = RUNTIME_NAMES[x];
      if(x == names['rname']){
        $('#run_name').append('<option selected>'+x+'</option>');
      }else{
        $('#run_name').append('<option>'+x+'</option>');
      }
    }
    for(var x in LOADTIME_NAMES){
      x = LOADTIME_NAMES[x];
      if(x == names['lname']){
        $('#load_name').append('<option selected>'+x+'</option>');
      }else{
        $('#load_name').append('<option>'+x+'</option>');
      }
    }

    //TODO Replace the boilerplate below with one function taking in the dom id and the values parameter
    $("#run_nameselector").submit(function(event){
      event.preventDefault(); //Don't actually submit anywhere
      var values = {};
      $.each($('#data-selector').serializeArray(), function(i, field) {
        values[field.name] = field.value;
      });

      var runvalues = {};
      $.each($('#run_nameselector').serializeArray(), function(i, field) {
        runvalues[field.name] = field.value;
      });
      search_name = runvalues["name"];

      //TODO: fix this. fix show_charts function sig
      if(search_name != "none selected"){
        //Do something to modify the data
        //show_charts(values, dname, search_name, dname);
        names['rname'] = search_name; 
        show_mochi_charts(values, names);
      }
    });
    $("#load_nameselector").submit(function(event){
      event.preventDefault(); //Don't actually submit anywhere
      var values = {};
      $.each($('#data-selector').serializeArray(), function(i, field) {
        values[field.name] = field.value;
      });

      var runvalues = {};
      $.each($('#load_nameselector').serializeArray(), function(i, field) {
        runvalues[field.name] = field.value;
      });
      search_name = runvalues["name"];

      //TODO: fix this. fix show_charts function sig
      if(search_name != "none selected"){
        //Do something to modify the data
        //show_charts(values, dname, search_name, dname);
        names['lname'] = search_name; 
        show_mochi_charts(values, names);
      }
    });
  }); //End $.getJSON
}

function populate_fields(){
  //Populate left selection menu
  fields = {}
  fields["tree"] = {}
  fields["test"] = {}
  fields["testgroup"] = {}
  fields["buildtype"] = {}
  fields["os"] = {}
  fields["platform"] = {}
  fields["perfdata"] = {}
  fields["perfdata"]["diskIO"] = {}
  fields["perfdata"]["writes"] = {}
  fields["perfdata"]["pagefaults"] = {}
  fields["perfdata"]["RunTime"] = {}
  fields["perfdata"]["LoadTime"] = {}

  $.getJSON("api/perfdata/", function(data) {
    //Once we get all the json, we should traverse it
    for(var x in data){
      datapoint = data[x];
      //Initialize fieldnames to store the possibilities
      fields["tree"][datapoint["tree"]] = 1;
      fields["test"][datapoint["test"]] = 1;
      fields["testgroup"][datapoint["testgroup"]] = 1;
      fields["buildtype"][datapoint["buildtype"]] = 1;
      fields["os"][datapoint["os"]] = 1;
      fields["platform"][datapoint["platform"]] = 1;

      for (y in datapoint["perfdata"]){
        metric = datapoint["perfdata"][y]

        if (metric["type"] == "diskIO"){
          //Save the metric's name into fields["perfdata"]["diskIO"]
          fields["perfdata"]["diskIO"][metric["name"]] = 1;
        }
        if (metric["type"] == "pagefaults"){
          //Save the metric's name into fields["perfdata"]["pagefaults"]
          fields["perfdata"]["pagefaults"][metric["name"]] = 1;
        }
        if (metric["type"] == "RunTime"){
          //Save the metric's name into fields["perfdata"]["pagefaults"]
          fields["perfdata"]["RunTime"][metric["name"]] = 1;
        }
        if (metric["type"] == "LoadTime"){
          //Save the metric's name into fields["perfdata"]["pagefaults"]
          fields["perfdata"]["LoadTime"][metric["name"]] = 1;
        }
      } //End loop over perfdata on a datapoint
    } //End looping over all data


    //Now we write into the form all the different option types
    //TODO: not convinced this actually works
    for(var x in fields["tree"]){
      $('#tree').append('<option>'+x+'</option>');
    }
    for(var x in fields["test"]){
      $('#test').append('<option>'+x+'</option>');
    }
    for(var x in fields["testgroup"]){
      $('#testgroup').append('<option>'+x+'</option>');
    }
    for(var x in fields["buildtype"]){
      $('#buildtype').append('<option>'+x+'</option>');
    }
    for(var x in fields["os"]){
      $('#os').append('<option>'+x+'</option>');
    }
    for(var x in fields["platform"]){
      $('#platform').append('<option>'+x+'</option>');
    }

    //OpNtions for diskio names
    DISKIO_NAMES = [];
    PAGEFAULT_NAMES = [];
    WRITE_NAMES = [];
    RUNTIME_NAMES = [];
    LOADTIME_NAMES = [];
    for (var x in fields["perfdata"]["diskIO"]){
      //x is the name of each type
      DISKIO_NAMES.push(x);
    }
    //Options for pagefault names
    for (var x in fields["perfdata"]["pagefaults"]){
      PAGEFAULT_NAMES.push(x);
    }
    for (var x in fields["perfdata"]["RunTime"]){
      RUNTIME_NAMES.push(x);
    }
    for (var x in fields["perfdata"]["LoadTime"]){
      LOADTIME_NAMES.push(x);
    }
  }); //End .getJSON()
}

function parseDate(datestr) {
  var parsed = datestr.split("-");
  var year = parsed[0];
  var month = parsed[1] - 1; //Javascript months index from 0 instead of 1
  var day = parsed[2];

  return Date.UTC(year, month, day);
}

function showXbrowserStartupCharts(params, dname, pname, wname) {

  show_loading(); //Show loading div to keep user happy

  //Build Resource URL
  var resourceURL = 'api/xbrowserstartup/?' + 
    Object.keys(params).filter(function(name) {
      return (params[name] !== "all");
    }).map(function(name) {
      return name + "=" + params[name];
    }).join("&");
  
  
  var test = params.test + "-" + params.style;
  var graphTitle = "";
  var jsontestname = "";

  switch (test) {
    case "local-onload-warm":
      graphtitle = "Local S1 (Blank) Warm";
      break;
    case "local-twitter-warm":
      graphtitle = "Local S2 (Twitter) Warm";
      break;
    case "remote-onload-warm":
      graphtitle = "Remote S1 (Blank) Warm";
      break;
    case "remote-twitter-warm":
      graphtitle = "Remote S2 (Twitter) Warm";
      break;
    default:
      alert("Unrecognized graph name, honestly you should never see this");
      return;
  }
  
  var data = $.getJSON(resourceURL, function(data) {

      var chart;
      jQuery(document).ready(function() {
        chart = new Highcharts.Chart({
          chart: {
            renderTo: 'container',
            type: 'spline'
          },
          title: {
            text: graphtitle
          },
          subtitle: {
            text: ''
          },
          xAxis: {
            type: 'datetime',
            dateTimeLabelFormats: {
              day: '%b-%e'
           }
         },
         yAxis: {
           title: {
             text: 'Milliseconds'
           },
           min: 0
         },
         series: data.series
        });
      });
  });
}


var testmap = {
  'remote-twitter': 'Remote Twitter Page',
  'local-twitter': 'Local Twitter Page',
  'remote-blank': 'Remote Blank Page',
  'local-blank': 'Local Blank Page'
};

var phonemap = {
  'galaxy_nexus': 'Galaxy Nexus',
  'samsung_gs2': 'Samsung Galaxy SII',
  'nexus_s': 'Nexus S',
  'nexus_one': 'Nexus One',
  'droid_pro': 'Droid Pro'
};

function testDescr(testname) {
  return (testname in testmap) ? testmap[testname] : testname;
}

function phoneName(phoneid) {
  return (phoneid in phonemap) ? phonemap[phoneid] : phoneid;
}


function showRawFennecStartupCharts(params) {
  $('#container').html(ich.rightpanel_loading());

  params.phoneid = params.phoneid.join(',');

  //Build Resource URL
  var resourceURL = 'api/s1s2/data/?' + 
    Object.keys(params).filter(function(name) {
      return (params[name] !== "all");
    }).map(function(name) {
      return name + "=" + params[name];
    }).join("&");
  
  $.getJSON(resourceURL, function(data) {
    $('#container').html('');
    var series = [];
    var points = [];
    for (phoneid in data) {
      points = [];
      for (blddate in data[phoneid][params.testname][params.metric]) {
        points.push([new Date(blddate).getTime(),
                     data[phoneid][params.testname][params.metric][blddate]]);
      }
      points.sort(function(x, y) { return x[0] < y[0]; });
      series.push({ data: points, label: phoneName(phoneid) });
    }
    if (series.length == 0) {
      $('#container').html(ich.rightpanel_nodata());
      return;
    }
    $.plot($('#container'), series, {
      series: {
        points: { show: true },
        lines: { show: true }
      },
      xaxis: { mode: 'time' },
      yaxis: { min: 0, axisLabel: 'time (ms)' },
      legend: { position: 'se' }
    });
  });
}

$(function() {
  var router = Router({
    '/': {
      on: function() {
        $('#floatleft').html('<div>&nbsp;</div>');
        $('#floatright').html(ich.index_rightpanel());
        $('#nav li').removeClass('active');
      }
    },
    '/diskio': {
      on: function() {
        $('#floatleft').html(ich.diskio_leftpanel());
        $('#floatright').html(ich.diskio_rightpanel());
        $('#nav li').removeClass('active');
        $('#nav_diskio').addClass('active');

        populate_fields();

        //Get request from form and draw relevant graphs
        $("#data-selector").submit(function(event){
          event.preventDefault(); //Don't actually submit anywhere
          var values = {};
          $.each($('#data-selector').serializeArray(), function(i, field) {
            values[field.name] = field.value;
          });
          show_charts(values);          
        });
      }
    },
    '/mochitest': {
      on: function() {
        $('#floatleft').html(ich.mochitest_leftpanel());
        $('#floatright').html(ich.mochitest_rightpanel());        
        $('#nav li').removeClass('active');
        $('#nav_mochitest').addClass('active');

        populate_fields();

        //Get request from form and draw relevant graphs
        $("#data-selector").submit(function(event){
          event.preventDefault(); //Don't actually submit anywhere
          var values = {};
          $.each($('#data-selector').serializeArray(), function(i, field) {
            values[field.name] = field.value;
          });
          show_mochi_charts(values);          
        });
      }
    },
    '/xbrowserstartup': {
      on: function() {
        $('#floatleft').html(ich.xbrowserstartup_leftpanel());
        $('#floatright').html(ich.xbrowserstartup_rightpanel());
        $('#nav li').removeClass('active');
        $('#nav_xbrowserstartup').addClass('active');

        // Get form request and draw graph
        $('#data-selector').submit(function(event){
          event.preventDefault();
          var values = {};
          $.each($('#data-selector').serializeArray(), function(i, field) {
            values[field.name] = field.value;
          });
          
          showXbrowserStartupCharts(values);
        });
      }
    },
    '/rawfennecstartup': {
       on: function() {
         $('#floatleft').html(ich.rawfennec_leftpanel());
         $('#floatright').html(ich.rawfennec_rightpanel());
         $('#nav li').removeClass('active');
         $('#nav_rawfennecstartup').addClass('active');

         $.getJSON('api/s1s2/params/', function(data) {
           $('#phonemenu').html('');
           $('#testmenu').html('');
           var i;
           for (i = 0; i < data.phones.length; i++) {
             $('#phonemenu').append(ich.phoneid_checkbox(
               { phoneid: data.phones[i], phonename: phoneName(data.phones[i]) }
             ));
           }
           for (i = 0; i < data.tests.length; i++) {
             $('#testmenu').append(ich.testname_option(
               { testname: data.tests[i], testdescr: testDescr(data.tests[i]) }
             ));
           }
         });
         
         // Get form request
         $('#data-selector').submit(function(event){
           function dateStr(d) {
             function pad(n) { return n < 10 ? '0' + n : n; }  
             return d.getFullYear() +
                    '-' + pad(d.getMonth() + 1) +
                    '-' + pad(d.getDate());
           }
           event.preventDefault();
           var values = {};
           var now = new Date();
           var today = new Date(now.getFullYear(), now.getMonth(),
                                now.getDate());
           $.each($('#data-selector').serializeArray(), function(i, field) {
             if (field.name == 'phoneid') {
               if (field.name in values) {
                 values[field.name].push(field.value);
               } else {
                 values[field.name] = [field.value];
               }
             } else if (field.name == 'date') {
               values['start'] = dateStr(new Date(today.getFullYear(),
                                                  today.getMonth(),
                                                  today.getDate() - field.value));
               values['end'] = dateStr(today);
             } else {
               values[field.name] = field.value;
             }
           });
           showRawFennecStartupCharts(values);
         });
       }
     }
  }).init('/');
});

