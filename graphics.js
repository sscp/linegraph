var data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
data = data.concat(data, data)

var textureBuffer;
var pMatrix;
var mvMatrix;
var gl;
var shaderProgram;
var testTexture;
var graphTimeLength = 60000;
var graphLastTime = (new Date).getTime();

function setMatrixUniforms()
{
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function initTextureFromCanvas(canvasElementId) {
  canvasTexture = gl.createTexture();
  return handleLoadedTexture(canvasTexture, document.getElementById(canvasElementId));
}

function handleLoadedTexture(texture, textureCanvas) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas); // This is the important line!
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  gl.generateMipmap(gl.TEXTURE_2D);

  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}


function TextBuffer()
{

}
function initTextBuffers()
{
  var vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0, 
        1.0, -1.0, 
        -1.0, 1.0, 
        -1.0, 1.0, 
        1.0, -1.0, 
        1.0,  1.0]), gl.STATIC_DRAW);
  vertexBuffer.itemSize = 2;
  vertexBuffer.numItems = 6;

  var textureBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0, 0.0, 
        1.0, 0.0, 
        0.0, 1.0, 
        0.0, 1.0, 
        1.0, 0.0, 
        1.0, 1.0]), gl.STATIC_DRAW);
  vertexBuffer.itemSize = 2;
  vertexBuffer.numItems = 6;

  return 
}



function LineGraph(shaderProgram, lineColor) {
    this.shaderProgram = shaderProgram;
    this.lineColor = lineColor;
    this.vertices = [-1.0,0.0,1.0,0.0];
    this.colors = lineColor.concat(lineColor);

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);
    this.vertexBuffer.itemSize = 2;
    this.vertexBuffer.numItems = 0;
    
    this.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.DYNAMIC_DRAW);
    this.colorBuffer.itemSize = 4;
    this.colorBuffer.numItems = 0;

    this.timeLength = 5000;
    this.lastTime = (new Date).getTime();

}

LineGraph.prototype.addDataPoint = function(timestamp, data) {
    var shift_left = 2.0*(timestamp - this.lastTime)/this.timeLength;
    for(var i=0;i<this.vertices.length;i+=2) {
        this.vertices[i]=this.vertices[i]-shift_left;
    }

    this.vertices.push(this.vertices[this.vertices.length-2],
            this.vertices[this.vertices.length-1],
            this.vertices[this.vertices.length-2]+shift_left,
            data);
    this.colors = this.colors.concat(this.lineColor, this.lineColor);

    if(this.vertices.length >= (8/shift_left)) {
        this.vertices.splice(0, 4);
        this.colors.splice(0, 8);
    } 
    this.colorBuffer.numItems = Math.floor(this.colors.length/4);
    this.vertexBuffer.numItems = Math.floor(this.vertices.length/2);
    this.lastTime = timestamp;
}

LineGraph.prototype.render = function() {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);    
    gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(this.shaderProgram.vertexColorAttribute, this.colorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.uniform1i(this.shaderProgram.samplerUniform, 0);
    setMatrixUniforms();
    gl.drawArrays(gl.LINES, 0, this.colorBuffer.numItems);
}


function drawScene(linegraphs) {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  for(var i=0;i<linegraphs.length;i++) {
    linegraphs[i].render();
  }
}

function initGL(canvas)
{
  try {
    gl = canvas.getContext("experimental-webgl");
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
  } catch (e) {
    alert("WebGL not supported");
  }
}

function getShader(gl, id) {
  var shaderScript = document.getElementById(id);
  if (!shaderScript) {
    return null;
  }

  var str = "";
  var k = shaderScript.firstChild;
  while (k) {
    if (k.nodeType == 3)
      str += k.textContent;
    k = k.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Could not initialize shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
  shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);


  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
} 

function initFontCanvas() {
  var canvas = document.getElementById('fontCanvas');
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "12px monospace";
  ctx.fillText(" !\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~", 0, 0);
}

function init()
{
  mvMatrix = mat4.create();
  pMatrix = mat4.create();
  var canvas = document.getElementById("mainCanvas");
  initGL(canvas);
  initShaders();
  gl.clearColor(0.0,0.0,0.0,1.0);
  gl.enable(gl.DEPTH_TEST);
  initFontCanvas();
  fontTexture = initTextureFromCanvas('fontCanvas');
  gl.bindTexture(gl.TEXTURE_2D, fontTexture);
  var linegraphs = [new LineGraph(shaderProgram, [1.0, 0.0, 0.0, 1.0]), new LineGraph(shaderProgram, [0.0, 1.0, 0.0, 1.0])];
  (function animate() {
   window.requestAnimationFrame((function() {
       linegraphs[0].addDataPoint((new Date).getTime(), Math.sin((new Date).getTime()/100));  
       linegraphs[1].addDataPoint((new Date).getTime(), Math.cos((new Date).getTime()/100));    

       drawScene(linegraphs);
       window.setTimeout(animate, 1000/60); // 1000/60
       }));
   })();
}
