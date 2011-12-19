function nav(data, parent) {
  // helper function to compute the distance between two points in pixel
  function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2))
  }

  var nav = {}
  // generate the navigation graph; nodes are pairs of traits, and an edge
  // between two nodes exist if they share a common trait
  nav.generateGraph = function() {
    // helper function to see whether two arrays have an element in common
    function intersects(array1, array2){
      for (var i=0; i<array1.length; i++)
        for (var j=0; j<array2.length; j++)
          if (array1[i] == array2[j]) return true;
      return false;
    } 
    var nodes = [], edges = [],
        ntraits = data.traits.length,
        numNodes = ntraits * (ntraits-1) / 2
    var k = 0
    for (var i = 0; i < ntraits; i++) {
      for (var j = i+1; j < ntraits; j++) {
        // push the node identifying pairs of coordinates
        var node = {
          name: data.traits[i]+':'+data.traits[j],
          traits: [data.traits[i], data.traits[j]],
          cos: Math.cos(2*Math.PI*k/numNodes),
          sin: Math.sin(2*Math.PI*k/numNodes),
          edges: [],
          active: false,
        }
        nodes.push(node)
        // push each edge where 2 nodes share at least one trait
        for (var l = 0; l < k; l++) {
          var otherNode = nodes[l]
          if (intersects(node.traits, otherNode.traits)) {
            var edge = { source: node, target: otherNode, active: false }
            edges.push(edge);
            node.edges.push(edge)
            otherNode.edges.push(edge)
          }
        }
        k += 1
      }
    }
    nav.graph = { nodes:nodes, edges:edges }
    nav.graph.reset = function () {
      for (var i=0; i<this.nodes.length; i++) {
        this.nodes[i].active = false;
      }
      for (var i=0; i<this.edges.length; i++) {
        this.edges[i].active = false;
      }
    }
    return nav.graph
  }

  // set up the navigation graph
  nav.setup = function(height, width, padding, mainDiv) {
    // first set up the nodes & edges
    var graph = nav.generateGraph()

    // set up the canvas
    nav = d3.select(mainDiv).html("")
        .append("svg")
        .attr("width", width + 2*padding)
        .attr("height", height + 2*padding);

    // helper function to scale the "x" and "y"s generated by generateGraph
    // into pixels on the screen
    function scale(a, shift, length) {
      if (!length) length = shift 
      return a*length/2 + shift/2;
    }
    function scaleWidth(d) { return scale(d.cos, width) }
    function scaleHeight(d) { return scale(d.sin, height) }

    // @TODO: should be able to do these with prototypes
    for (var i=0; i<graph.edges.length; i++) {
      var edge = graph.edges[i]
      edge.length = distance(scaleWidth(edge.source), scaleHeight(edge.source),
                             scaleWidth(edge.target), scaleHeight(edge.target))
    }
    function activateEdge(edge) {
      edge.active = true;
      edge.target.active = true;
      edge.source.active = true;
    }

    // activate the first elt & plot the scatter plot
    var initialNode = graph.nodes[0]
    for (var i = 0; i< initialNode.edges.length; i++) {
      activateEdge(initialNode.edges[i])
    }
    parent.scatter.position(initialNode.traits[0], initialNode.traits[1], 0.5)

    // position the non-moving elements: nodes edges and labels
    var edges = nav.selectAll("line.link")
          .data(graph.edges)
        .enter().append("line")
          .attr("class", "link")
          .attr("transform", "translate("+padding+","+padding+")")
          .attr("x1", function(d) { return scaleWidth(d.source); })
          .attr("y1", function(d) { return scaleHeight(d.source); })
          .attr("x2", function(d) { return scaleWidth(d.target); })
          .attr("y2", function(d) { return scaleHeight(d.target); })
          .style("stroke-width", 5)
          .style("stroke", colour.nav)
          .attr("class", function(d) {
            if (d.active) {
              return "link active";
            } return "link"
          });

    var nodes = nav.selectAll("circle.node")
          .data(graph.nodes)
        .enter().append("circle")
          .attr("class", "node")
          .attr("transform", "translate("+padding+","+padding+")")
          .attr("cx", scaleWidth)
          .attr("cy", scaleHeight)
          .attr("r", 15)
          .style("fill", colour.nav)
          .attr("class", function(d) {
            if (d.active) { 
              return "node active";
            } return "node"
          });

    var labels = nav.selectAll("labeltext")
          .data(graph.nodes)
        .enter().append("text")
          .attr("class", "text")
          .attr("transform", "translate("+padding+","+(padding+3)+")")
          .attr("x", function(d) { return scale(d.cos, width, width+85)})
          .attr("y", function(d) { return scale(d.sin, height, height+55)})
          .text(function(d) { return d.name })
          .attr("text-anchor", "middle")

    // function to replot nodes & edges
    function replot(selectorX, selectorY, transition) {
      nav.selectAll("line.link") // recolour edges
         .style("stroke", colour.nav)
         .attr("class", function(d) {
           if (d.active) {
             return "link active";
           } return "link"
         })
      nav.selectAll("circle.node") // recolour nods
         .style("fill", colour.nav)
         .attr("class", function(d) {
           if (d.active) { 
             return "node active";
           } return "node"
         })
      selector.transition() // move the selector
              .ease("linear")
              .duration(1000 * transition)
              .attr("cx", selectorX)
              .attr("cy", selectorY)
    }

    // position the selector
    var selector = nav.selectAll("selectornode")
          .data([1])
        .enter().append("circle")
          .attr("class", "selector")
          .attr("transform", "translate("+padding+","+padding+")")
          .attr("cx", scale(1, width))
          .attr("cy", scale(0, height))
          .attr("r", 13)
          .style("fill", colour.selector)

    selector.selected = initialNode
    selector.selectedEdge = null

    // movement to another (active) node
    nodes.on("click", function(node) { 
      if (node.active) {
        selector.selected = node
        // reset active elements 
        graph.reset()
        for (var i=0; i<node.edges.length; i++) {
          activateEdge(node.edges[i])
        }
        // calculate the amount of movement/transition to be made
        var transition = 0.8 
        if (selector.selectedEdge) {
          transition = (distance(selector.attr("cx"), selector.attr("cy"),
                                  scaleWidth(node), scaleHeight(node))
                        / selector.selectedEdge.length)
        }
        // plot!!
        parent.scatter.position(node.traits[0], node.traits[1], transition)
        replot(scaleWidth(node), scaleHeight(node), transition)
        selector.selectedEdge = null
      }
    });

    // movement to the middle of an edge (requires interpolation)
    edges.on("mousedown", function(edge) {
      if (edge.active) {
        var x, y
        if (d3.event.offsetX) {
          x = d3.event.offsetX-padding
          y = d3.event.offsetY-padding
        } else {
          x = d3.event.layerX-padding-7
          y = d3.event.layerY-padding-10
        }
        selector.selectedEdge = edge
        // reset active elements
        graph.reset()
        activateEdge(edge)
        // calculate the amount of movement/transition to be made
        transition = (distance(selector.attr("cx"),selector.attr("cy"), x, y)
                        / edge.length)
        // calculate direction that the scatter plot is rotating towards
        // and other useful data
        var rotatingTo = edge.target
        if (selector.selected == edge.target) {
          rotatingTo = edge.source
        }
        var interpolation = (distance(x, y, scaleWidth(rotatingTo),
                                            scaleHeight(rotatingTo))
                              / edge.length)
        // plot!!
        parent.scatter.interpolate(rotatingTo.traits[0], rotatingTo.traits[1],
                                   interpolation, transition)
        replot(x, y, transition)
      }
    });
  }
  return nav;
}
