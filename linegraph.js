var pMatrix;
var mvMatrix;
var gl;
var mousePos = {x: 0, y: 0};
var colorWhite = {r: 1.0, g: 1.0, b: 1.0, a: 1.0};

function setMatrixUniforms(shaderProgram)
{
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function LineGraph(shaderProgram, timeLength, lineColor) {
  this.shaderProgram = shaderProgram;
  this.lineColor = lineColor;
  this.vertices = [-1.0,0.0,1.0,0.0];
  this.vertScale = 1.0;
  this.vertOffset = 0.0;
  this.horizOffset = 0.0;
  this.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);    
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);
  this.vertexBuffer.itemSize = 2;
  this.vertexBuffer.numItems = 0;

  this.timeLength = timeLength;
  this.lastTime = (new Date).getTime();
  this.textureBuffer = gl.createBuffer();
  this.textureBuffer.itemSize = 2;
  this.textureBuffer.numItems = 1;
}

LineGraph.prototype.setTimeLength = function(timeLength) {
  this.timeLength = timeLength;
  //this.vertices = [-1.0,0.0,1.0,0.0];
  //this.vertexBuffer.numItems = 0;
}

LineGraph.prototype.setVerticalScale = function(vertScale) {
  this.vertScale = vertScale;
}

LineGraph.prototype.setVerticalOffset = function(vertOffset) {
  this.vertOffset = vertOffset;
}

LineGraph.prototype.getMax = function() {
  var maxValue = Number.MIN_VALUE;
  for(var i=1;i<this.vertices.length;i+=2) {
    maxValue = Math.max(this.vertices[i], maxValue);
  }
  return maxValue; 
}

LineGraph.prototype.getMin = function() {
  var minValue = Number.MAX_VALUE;
  for(var i=1;i<this.vertices.length;i+=2) {
    minValue = Math.min(this.vertices[i], minValue);
  }
  return minValue; 
}

LineGraph.prototype.increaseTimeLength = function() {
  this.setTimeLength(this.timeLength*2.0);
}

LineGraph.prototype.addDataPoint = function(timestamp, data) {
  var shiftLeft = 2.0*(timestamp - this.lastTime);
  this.horizOffset+=shiftLeft;
  /*for(var i=0;i<this.vertices.length;i+=2) {
    this.vertices[i]=this.vertices[i]-shift_left;
  }*/

  this.vertices.push(this.vertices[this.vertices.length-2],
      this.vertices[this.vertices.length-1],
      this.vertices[this.vertices.length-2]+shiftLeft,
      data);

  while((this.vertices.length >= 8) && ((this.vertices[2]-this.horizOffset) < (-1.0*this.timeLength))) {
    this.vertices.splice(0, 4);
  } 
  this.vertexBuffer.numItems = Math.floor(this.vertices.length/2);
  this.lastTime = timestamp;
}

LineGraph.prototype.render = function() {
  gl.useProgram(this.shaderProgram);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);    
  gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
  //gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
  //gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1.0, 1.0]), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(this.shaderProgram.vertexTextureAttribute, 2, gl.FLOAT, false, 0, 0);
  gl.uniform4f(gl.getUniformLocation(this.shaderProgram, "color"), this.lineColor[0], this.lineColor[1], this.lineColor[2], this.lineColor[3]);
  gl.uniform2f(gl.getUniformLocation(this.shaderProgram, "offset"), this.horizOffset-this.timeLength/2.0, this.vertOffset);
  gl.uniform2f(gl.getUniformLocation(this.shaderProgram, "scale"), 2.0/this.timeLength, this.vertScale);


  gl.uniform1i(this.shaderProgram.samplerUniform, 0);
  setMatrixUniforms(this.shaderProgram);
  gl.drawArrays(gl.LINES, 0, this.vertexBuffer.numItems);
}

LineGraph.prototype.getValueForX = function(xPos) {
  var xCorrected = this.horizOffset - (1.0-xPos)*(this.timeLength)*0.5;
  var i = 0;
  while((this.vertices[i*2] < xCorrected) && ((i*2) < (this.vertices.length-2))) {
    i++;
  }

  var interpVal = 0;
  if(i == 0) {
    interpVal = this.vertices[i*2+1];
  }
  else {
    var prevVal = this.vertices[(i-1)*2+1];
    var nextVal = this.vertices[i*2+1];
    var prevX = this.vertices[(i-1)*2];
    var nextX = this.vertices[i*2];
    var xDiff = nextX - prevX;
    var nextValScale = Math.abs((xCorrected - prevX)/xDiff);
    var prevValScale = Math.abs((nextX - xCorrected)/xDiff);
    interpVal = prevVal * prevValScale + nextVal * nextValScale;
  }

  return interpVal;
}

function GridLines(shaderProgram, lineColor, xPitch, yPitch) {
  this.shaderProgram = shaderProgram;
  this.lineColor = lineColor;
  this.xPitch = xPitch;
  this.yPitch = yPitch;
  this.init();
}

GridLines.prototype.init = function() {
  var xPos = -1.0;
  this.vertices = [];
  while(xPos <= 1.0) {
    this.vertices = this.vertices.concat([xPos, -1.0, xPos, 1.0]);
    xPos+=this.xPitch;
  }

  var yPos = -1.0;
  while(yPos <= 1.0) {
    this.vertices = this.vertices.concat([-1.0, yPos, 1.0, yPos]);
    yPos+=this.yPitch;
  }
  
  this.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);    
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);
  this.vertexBuffer.itemSize = 2;
  this.vertexBuffer.numItems = this.vertices.length/2;
}

GridLines.prototype.render = function() {
  gl.useProgram(this.shaderProgram);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);    
  gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.vertexAttribPointer(this.shaderProgram.vertexTextureAttribute, 2, gl.FLOAT, false, 0, 0);
  gl.uniform4f(gl.getUniformLocation(this.shaderProgram, "color"), this.lineColor[0], this.lineColor[1], this.lineColor[2], this.lineColor[3]);
  gl.uniform2f(gl.getUniformLocation(this.shaderProgram, "offset"), 0.0, 0.0);
  gl.uniform2f(gl.getUniformLocation(this.shaderProgram, "scale"), 1.0, 1.0);


  gl.uniform1i(this.shaderProgram.samplerUniform, 0);
  setMatrixUniforms(this.shaderProgram);
  gl.drawArrays(gl.LINES, 0, this.vertexBuffer.numItems);
}

function drawScene(gridLines, linegraphs, textRender, graphMetadata) {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.clearColor(0.2, 0.2, 0.2, 1.0);
  gridLines.render();
  for(var i=0;i<linegraphs.length;i++) {
    textRender.render(((1.0/linegraphs[i].vertScale)+linegraphs[i].vertOffset).toPrecision(3).toString(), 0.87, 0.93, colorWhite);
    textRender.render(((-1/linegraphs[i].vertScale)+linegraphs[i].vertOffset).toPrecision(3).toString(), 0.87, -1.0, colorWhite);
    textRender.render((-1*linegraphs[i].timeLength/1000).toString()+"s", -1.0, -1.0, colorWhite);
    gl.disable(gl.BLEND);
    linegraphs[i].render();
    gl.enable(gl.BLEND);
  }
  
  var mouseX = 2.0*mousePos.x/textRender.mainCanvas.width - 1.0;
  var mouseY = -2.0*mousePos.y/textRender.mainCanvas.height + 1.0;
  var textHeight = 2.0*(textRender.charHeight/textRender.mainCanvas.height);

  var observedParamY = 0.90-(linegraphs.length*textHeight) 
  for(var i=0;i<linegraphs.length;i++) {
    var textColor = {r: linegraphs[i].lineColor[0], g:linegraphs[i].lineColor[1], b:linegraphs[i].lineColor[2],a:linegraphs[i].lineColor[3]};
    var observedParam = graphMetadata[i].device+"."+graphMetadata[i].parameter;
    textRender.render(observedParam, -0.95, observedParamY, textColor);
    var value = linegraphs[i].getValueForX(mouseX);
    textRender.render(value.toPrecision(5).toString(), mouseX, mouseY, textColor);
    mouseY += textHeight;
    observedParamY += textHeight;
  }

}

function initGL(canvas)
{
  try {
    gl = canvas.getContext("webgl", {antialias:true});
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    gl.depthFunc(gl.LEQUAL);
  } catch (e) {
    alert("WebGL not supported");
  }
}

function initFontCanvas() {
  var canvas = $('#fontCanvas')[0];
  var ctx = canvas.getContext('2d');
  //ctx.fillStyle = "#000000";
  //ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = '100 12px "libmono"';
  ctx.fillText(" !\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~", 0, 0);
}

function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

function init()
{
  "use strict";
  mvMatrix = mat4.create();
  pMatrix = mat4.create();
  var canvas = $('#mainCanvas')[0];
  initGL(canvas);
  var lineShaderProgram = initShaders("shader-vs", "shader-fs", false, false);
  gl.clearColor(0.0,0.0,0.0,1.0);
  gl.enable(gl.DEPTH_TEST);
  initFontCanvas();
  var textShaderProgram = initShaders("font-vs", "font-fs", false, true);
  var textRender = new TextRender('fontCanvas', 'mainCanvas', textShaderProgram, 7, 14);


  var hash = window.location.hash.substring(1).toLowerCase();
  var hash_graphs = hash.split("&");

  var graphMetadata = [];
  var devicesParametersDict = {};


  hash_graphs.forEach(function(element, index, array) {
    var hash_vars = element.split(":");
    if(hash_vars.length < 2) {
      hash_vars = ['', ''];
    }
    //graphMetadata = graphMetadata.concat([{device: hash_vars[0], parameter: hash_vars[1]}]);
    var select = $('#selectDevice')[0];
    var el = document.createElement("option");
    el.textContent = hash_vars[0];
    el.value = hash_vars[0]
    select.appendChild(el);
 
    devicesParametersDict[hash_vars[0]] = [hash_vars[1]];
    /*select = document.getElementById("selectParameter");
    el = document.createElement("option");
    el.textContent = hash_vars[1];
    el.value = hash_vars[1];
    select.appendChild(el);*/
  });

  $('#selectDevice').change(function(evt) {
    var device = selectDevice.options[selectDevice.selectedIndex].value;
    var select = document.getElementById("selectParameter");
    while (select.hasChildNodes()) {
      select.removeChild(select.lastChild);
    }
    devicesParametersDict[device].forEach(function(element, index, array) {
      var el = document.createElement("option");
      el.textContent = element;
      el.value = element;
      select.appendChild(el);
    });
  });

  $('#selectDevice').trigger('change');

  var graphColors = [[1, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1], [1, 1, 0, 1], [1, 0, 1, 1], [0, 1, 1, 1]];

  var linegraphs = []; 

  for(var i=0;i<graphMetadata.length;i++) {
    linegraphs = linegraphs.concat([new LineGraph(lineShaderProgram, 5000, graphColors[i%graphColors.length])]);
  }

  $('#increaseTimeLength')[0].onclick = function() {
    for(var i=0;i<linegraphs.length;i++) {
      linegraphs[i].setTimeLength(linegraphs[i].timeLength*2);
    }
  };

  $('#decreaseTimeLength')[0].onclick = function() {
    for(var i=0;i<linegraphs.length;i++) {
      linegraphs[i].setTimeLength(linegraphs[i].timeLength/2);
    }
  };

  $('#increaseVertOffset')[0].onclick = function() {
    for(var i=0;i<linegraphs.length;i++) {
      linegraphs[i].setVerticalOffset(linegraphs[i].vertOffset+0.25/linegraphs[i].vertScale);
    }
  };

  $('#decreaseVertOffset')[0].onclick = function() {
    for(var i=0;i<linegraphs.length;i++) {
      linegraphs[i].setVerticalOffset(linegraphs[i].vertOffset-0.25/linegraphs[i].vertScale);
    }
  };
  

  $('#increaseVertMax')[0].onclick = function() {
    for(var i=0;i<linegraphs.length;i++) {
      linegraphs[i].setVerticalScale(linegraphs[i].vertScale/2);
    }
  };

  $('#decreaseVertMax')[0].onclick = function() {
    for(var i=0;i<linegraphs.length;i++) {
      linegraphs[i].setVerticalScale(linegraphs[i].vertScale*2);
    }
  };
 
  $('#fitVert')[0].onclick = function() {
    var maxValue = Number.MIN_VALUE;
    var minValue = Number.MAX_VALUE;
    for(var i=0;i<linegraphs.length;i++) {
      maxValue = Math.max(linegraphs[i].getMax(), maxValue);
      minValue = Math.min(linegraphs[i].getMin(), minValue);
    }
    var scale = 1.6/Math.abs(maxValue - minValue);
    var offset = (maxValue+minValue)/2.0;
    for(var i=0;i<linegraphs.length;i++) {
      linegraphs[i].setVerticalScale(scale);
      linegraphs[i].setVerticalOffset(offset);
    }
  };

  canvas.addEventListener('mousemove', function(evt) {
    mousePos = getMousePos(canvas, evt);
  }, false);

  var loc = (document.location.protocol=="https:" ? "wss://" : "ws://")
      + document.location.host;
  var ws=new WebSocket(loc);
  ws.onopen = function(){
    console.log("websocket open!");
  };
  ws.onclose = function(){
    console.log("websocket closed...");
  };
  ws.onmessage = function(evt){
    if(window.pause) return;
    //console.log(evt.data);
    var msg = JSON.parse(evt.data);
    graphMetadata.forEach(function(element, index, array) {
      if((element.parameter.toLowerCase() == msg.var.toLowerCase()) && (element.device.toLowerCase() == msg.dev.toLowerCase())) {
        linegraphs[index].addDataPoint((new Date).getTime(), msg.val);  
      }
    });
    if(devicesParametersDict[msg.dev] == undefined) {
      devicesParametersDict[msg.dev] = [msg.var];
      var select = $('#selectDevice')[0];
      var el = document.createElement("option");
      el.textContent = msg.dev;
      el.value = msg.dev;
      select.appendChild(el);
    }
    else if($.inArray(msg.var, devicesParametersDict[msg.dev]) == -1){
      devicesParametersDict[msg.dev] = devicesParametersDict[msg.dev].concat([msg.var]);
      var select = $('#selectParameter')[0];
      var el = document.createElement("option");
      el.textContent = msg.var;
      el.value = msg.var;
      select.appendChild(el);
    }
  };

  document.getElementById('addParameter').onclick = function() {
    var selectDevice = $('#selectDevice')[0];
    var device = selectDevice.options[selectDevice.selectedIndex].value;
    var selectParameter = $('#selectParameter')[0];
    var parameter = selectParameter.options[selectParameter.selectedIndex].value;
    var haveParameter = false;
    graphMetadata.forEach(function(element, index, array) {
      if(element.device == device && element.parameter == parameter) {
        haveParameter = true;
      }
    }); 

    if(haveParameter == false) {
      var timeLength = 5000;
      var vertScale = 1;
      var vertOffset = 0;
      if(linegraphs.length > 0) {
         timeLength = linegraphs[0].timeLength;
         vertScale = linegraphs[0].vertScale;
         vertOffset = linegraphs[0].vertOffset;
      }
      var newLinegraph = new LineGraph(lineShaderProgram, timeLength, graphColors[linegraphs.length%graphColors.length]);
      newLinegraph.vertScale = vertScale;
      newLinegraph.vertOffset = vertOffset;
      linegraphs = linegraphs.concat([newLinegraph]);
      graphMetadata = graphMetadata.concat([{device: device, parameter: parameter}]);
    }
  }

  document.getElementById('delParameter').onclick = function() {
    var selectDevice = $('#selectDevice')[0];
    var device = selectDevice.options[selectDevice.selectedIndex].value;
    var selectParameter = $('#selectParameter')[0];
    var parameter = selectParameter.options[selectParameter.selectedIndex].value;
    var graphIndex = -1;
    graphMetadata.forEach(function(element, index, array) {
      if(element.device == device && element.parameter == parameter) {
        graphIndex = index;
      }
    });
    if(graphIndex != -1) {
      linegraphs.splice(graphIndex, 1);
      graphMetadata.splice(graphIndex, 1);
    }
  }

  var gridLines = new GridLines(lineShaderProgram, [0.0, 0.0, 0.0, 0.2], 0.05, 0.05);

  function animate() {
   window.requestAnimationFrame((function() {
       drawScene(gridLines, linegraphs, textRender, graphMetadata);
       window.setTimeout(animate, 1000/60); // 1000/60
       }));
   };
  animate();
}
