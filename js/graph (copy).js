'use strict';

/*
This class is probably the most complicated of them all
It needs to be able to use many kinds of different data formats

*/
class HistGraph {

  constructor(datapath, graphId, {
    districtFeature = 'District.Name',
    yearFeature = 'Year',
    mainFeature = 'Number',
    xAxisPx = "20px",
    xAxisTrans = "translate(-10,0)rotate(-45)",
    yAxisPx = "16px",
    color = "#69b3a2",
    filterYear = null,
    filterMonth = null,
    width_ = 300,
    height_ = 300,
    margin = {
      top: 10,
      right: 30,
      bottom: 70,
      left: 80
    }
  } = {}) {

    this.margin = margin
    this.graphId = graphId
    this.rectId = graphId + "rects"
    this.color = color
    this.width = width_ - margin.left - margin.right
    this.height = height_ - margin.top - margin.bottom;
    this.dataset = d3.csv(datapath)

    this.currentData = null

    this.districtFeature = districtFeature
    this.yearFeature = yearFeature
    this.mainFeature = mainFeature

    this.filterYear = filterYear
    this.filterMonth = filterMonth

    this.xAxisPx = xAxisPx
    this.xAxisTrans = xAxisTrans
    this.yAxisPx = yAxisPx

    this.dataset.then(data => this.aggData(data))
      .then(([districtD, totalD]) => {
        this.perDistrictData = districtD
        this.totalData = totalD
        this.createGraph(totalD)
        this.currentData = totalD
      })

  }

  aggData(data) {

    /* Apply the first filter on month and year if they are defined*/
    if (this.filterYear) {
      data = _(data).filter(d => d.Year == this.filterYear).value()
    }
    if (this.filterMonth) {
      data = _(data).filter(d => d.Month == this.filterMonth).value()
    }

    
    let per_district_pop = _(data)
      .groupBy(i => [i[this.yearFeature], i[this.districtFeature]])
      .map((d, id) => ({
        year: id.split(',')[0],
        name: id.split(',')[1],
        total: _.sumBy(d, i => Number(i[this.mainFeature]))
      })).value()

    let total_pop = _(per_district_pop).groupBy('year').map((d, id) => ({
      year: id,
      total: _.sumBy(d, 'total')
    })).value()


    return [per_district_pop, total_pop]
  }


  createGraph(totalData) {

    // append the svg object to the body of the page
    let svg = d3.select("#" + this.graphId)
      .append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform",
        "translate(" + this.margin.left + "," + this.margin.top + ")")
      .attr("id", "someid")


    // X axis
    let x = d3.scaleBand()
      .range([0, this.width])
      .domain(totalData.map(function(d) {
        return d.year;
      }).sort())
      .padding(0.2);

    // Add X axis
    svg.append("g").attr("class", "axisx")
      .attr("transform", "translate(0," + this.height + ")")
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("font-size", this.xAxisPx)
      .attr("transform", this.xAxisTrans)
      .style("text-anchor", "end");

    // Y axis
    let formatValue = d3.format(".2s");
    let y = d3.scaleLinear()
      .domain([0.95 * d3.min(totalData.map((d) => d.total)), d3.max(totalData.map((d) => d.total))])
      .range([this.height, 0])




    // Add Y axis
    svg.append("g").attr("class", "axisy")
      .call(d3.axisLeft(y).tickFormat(function(d) {
        return formatValue(d)
      })).selectAll("text").style("font-size", this.yAxisPx)

    let g = svg.append('g').attr('id', 'bargroupg')


    let data = totalData
    let groups = _.chain(totalData).map('year').uniq().value().sort()

    var barGroups = g.selectAll("g.layer").data(data);
    barGroups.enter().append("g").classed('layer', true)
      .attr("transform", function(d) {
        return "translate(" + x(d.year) + ",0)";
      });

    barGroups.exit().remove();
    //.data(function(d) { return subgroups.map(function(key) { return {key: key, value: d[key]}; }); });
    var bars = g.selectAll("g.layer").selectAll("rect")
      .data(function(d) {
        return [d]
      });
    bars.enter().append("rect")
      .attr("width", x.bandwidth())
      .attr("x", function(d) {
        return 0;
      })
      .attr("fill", this.color)
      .transition().duration(750)
      .attr("y", function(d) {
        return y(d.total);
      })
      .attr("height", (d) => {
        return this.height - y(d.total);
      });

    bars
      .transition().duration(750)
      .attr("y", function(d) {
        return y(d.total);
      })
      .attr("height", (d) => {
        return this.height - y(d.total);
      });

    bars.exit().remove();
  }

  updateYAxis(startingFromZero, transitionDuration = 700) {

    let y = null

    if (startingFromZero) {
      y = d3.scaleLinear()
        .domain([0, d3.max(this.currentData.map((d) => d.total))])
        .range([this.height, 0]);
    } else {
      y = d3.scaleLinear()
        .domain([0.95 * d3.min(this.currentData.map((d) => d.total)), d3.max(this.currentData.map((d) => d.total))])
        .range([this.height, 0]);
    }

    d3.select("#" + this.graphId).select(".axisy").transition().duration(transitionDuration).call(d3.axisLeft(y)).selectAll("text").style("font-size", this.yAxisPx)

    let data = null



    if (this.districts.length == 2) {
      data = this.currentData.sort((el1, el2) => {
        if (el1.year == el2.year) {
          if (el1.name == this.districts[0]) {
            return -1
          } else {
            return 1
          }

        } else {
          if (el1.year < el2.year) {
            return -1
          } else {
            return 1
          }
        }
      })
    } else {
      data = _.sortBy(this.currentData, ['year'])
    }

    let rects = d3.select('#' + this.graphId).select('#bargroupg').selectAll("rect")
      .data(data)

    rects.enter()
      .append('rect')

    rects.transition()
      .duration(transitionDuration)
      .attr("y", function(d) {
        return y(d.total);
      })
      .attr("height", (d) => {
        return this.height - y(d.total);
      })

    rects.exit().remove()

  }

  update(districts, callBack = () => {}, transitionDuration = 500) {
    this.districts = districts
    let filtered_dat = _.filter(this.perDistrictData, (d) => districts.includes(d.name))

    let subgroups = districts //selected districts

    if (districts.length == 0) {

      // X axis
      let x = d3.scaleBand()
        .range([0, this.width])
        .domain(this.totalData.map(function(d) {
          return d.year;
        }).sort())
        .padding(0.2);


      // Y axis
      let y = d3.scaleLinear()
        .domain([0.95 * d3.min(this.totalData.map((d) => d.total)), d3.max(this.totalData.map((d) => d.total))])
        .range([this.height, 0]);

      let data = this.totalData
      let g = d3.select('#' + this.graphId).select('#bargroupg')
      let groups = _.chain(this.totalData).map('year').uniq().value().sort()

      var barGroups = g.selectAll("g.layer").data(data);
      barGroups.enter().append("g").classed('layer', true)
        .attr("transform", function(d) {
          return "translate(" + x(d.year) + ",0)";
        });

      barGroups.exit().remove();
      //.data(function(d) { return subgroups.map(function(key) { return {key: key, value: d[key]}; }); });
      var bars = g.selectAll("g.layer").selectAll("rect")
        .data(function(d) {
          return [d]
        });
      bars.enter().append("rect")
        .attr("width", x.bandwidth())
        .attr("x", function(d) {
          return 0;
        })
        .attr("fill", this.color)
        .transition().duration(750)
        .attr("y", function(d) {
          return y(d.total);
        })
        .attr("height", (d) => {
          return this.height - y(d.total);
        });

      bars
        .transition().duration(750)
        .attr("y", function(d) {
          return y(d.total);
        })
        .attr("height", (d) => {
          return this.height - y(d.total);
        });

      bars.exit().remove();

      d3.select("#" + this.graphId).select(".axisx").transition().call(d3.axisBottom(x).tickSize(0));

      d3.select("#" + this.graphId).select(".axisy").transition().call(d3.axisLeft(y)).on('end', callBack).selectAll("text").style("font-size", this.yAxisPx);

      return
    }
    //subgroups = ['Sant Martí', "Horta-Guinardó"]
    let groups = _.chain(filtered_dat).map('year').uniq().value().sort() // year

    this.currentData = filtered_dat


    let data = (_(this.currentData).groupBy('year').map((d, id) => Object.fromEntries([
      ['year', id]
    ].concat(d.map(i => [i['name'], i['total']])))).value())

    let svg = d3.select('#' + this.graphId + ' svg g')


    // Add X axis
    var x = d3.scaleBand()
      .domain(groups)
      .range([0, this.width])
      .padding([0.2])
    d3.select("#" + this.graphId).select(".axisx").transition().call(d3.axisBottom(x).tickSize(0));

    // Add Y axis
    var y = d3.scaleLinear()
      .domain([0.95 * d3.min(filtered_dat.map((d) => d.total)), d3.max(filtered_dat.map((d) => d.total))])
      .range([this.height, 0]);

    d3.select("#" + this.graphId).select(".axisy").transition().call(d3.axisLeft(y)).on('end', callBack).selectAll("text").style("font-size", this.yAxisPx);


    // Another scale for subgroup position?
    var xSubgroup = d3.scaleBand()
      .domain(subgroups)
      .range([0, x.bandwidth()])
      .padding([0.05])

    // color palette = one color per subgroup
    var color = d3.scaleOrdinal()
      .domain(subgroups)
      .range(['#377eb8', '#e41a1c', '#4daf4a'])

    // Show the bars
    /*
  svg.
    // Enter in data = loop group per group
    .data(data)
    .enter()
    .append("g")
      .attr("transform", function(d) { return "translate(" + x(d.year) + ",0)"; })
    .selectAll("rect")
    .data(function(d) { return subgroups.map(function(key) { return {key: key, value: d[key]}; }); })
    .enter().append("rect").transition()
      .attr("x", function(d) { return xSubgroup(d.key); })
      .attr("y", function(d) { return y(d.value); })
      .attr("width", xSubgroup.bandwidth())
      .attr("height", (d) => { console.log(this.height - y(d.value));return this.height - y(d.value); })
      .attr("fill", function(d) { return color(d.key); });

    let rects = d3.select('#' + this.rectId).selectAll("rect")
    rects.exit().remove()
*/


    let g = d3.select('#' + this.graphId).select('#bargroupg')
    var barGroups = g.selectAll("g.layer")

    barGroups.exit().remove();

    barGroups.data(data);



    barGroups.enter().append("g").classed('layer', true)
      .attr("transform", function(d) {
        return "translate(" + x(d.year) + ",0)";
      });

    barGroups.exit().remove();

    var bars = g.selectAll("g.layer").selectAll("rect")
      .data(function(d) {
        return subgroups.map(function(key) {
          return {
            key: key,
            value: d[key]
          };
        });
      });

    bars.exit().remove();

    bars.enter().append("rect")

    bars.exit().remove();

    bars.attr("width", xSubgroup.bandwidth())
      .attr("x", function(d) {
        return xSubgroup(d.key);
      })
      .attr("fill", (d) => {
        if (districts.length > 1) {
          return color(d.key);
        } else {
          return this.color
        }
      })
      .transition().duration(750)
      .attr("y", function(d) {
        return y(d.value);
      })
      .attr('width', x.bandwidth())
      .attr("height", (d) => {
        return this.height - y(d.value);
      });

    bars
      .transition().duration(750)
      .attr("y", function(d) {
        return y(d.value);
      })
      .attr("height", (d) => {
        return this.height - y(d.value);
      });


    /*
    d3.selectAll("#" + this.graphId + ' svg')
    .append('g').attr('id','mainbars').selectAll('g')
      // Enter in data = loop group per group
      .data(data)
      .enter()
      .append("g").attr('id','Groups')
        .attr("transform", function(d) { return "translate(" + x(d.year) + ",0)"; })
      .selectAll("rect")
      .data(function(d) { return subgroups.map(function(key) { return {key: key, value: d[key]}; }); })
      .enter().append("rect")
        .attr("x", function(d) { return xSubgroup(d.key); })
        .attr("y", function(d) { return y(d.value); })
        .attr("width", xSubgroup.bandwidth())
        .attr("height", (d) => { return this.height - y(d.value); })
        .attr("fill", function(d) { return color(d.key); });
        */
    /*
    let x = d3.scaleBand()
      .range([0, this.width])
      .domain(filtered_dat.map(function(d) {
        return d.year;
      }).sort())
      .padding(0.2);

    let y = d3.scaleLinear()
      .domain([0.95 * d3.min(filtered_dat.map((d) => d.total)), d3.max(filtered_dat.map((d) => d.total))])
      .range([this.height, 0]);

    d3.select("#" + this.graphId).select(".axisx").transition().duration(transitionDuration).call(d3.axisBottom(x)).on('end', callBack)
    d3.select("#" + this.graphId).select(".axisy").transition().duration(transitionDuration).call(d3.axisLeft(y))

    let rects = d3.select('#' + this.rectId).selectAll("rect")
      .data(filtered_dat)

    rects.enter()
      .append('rect')

    rects.transition()
      .duration(transitionDuration)
      .attr("y", function(d) {
        return y(d.total);
      })
      .attr("height", (d) => {
        return this.height - y(d.total);
      })

    rects.exit().remove()
    */
  }
}
