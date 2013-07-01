var data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
data = data.concat(data, data)

var vertexBuffer;
var textureBuffer;
var colorBuffer;
var pMatrix;
var mvMatrix;
var gl;
var shaderProgram;
var testTexture;

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

/*
function handleLoadedTexture(texture) 
{
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    
    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.clearColor(0.0,0.0,0.0,1.0);
    gl.enable(gl.DEPTH_TEST);

    drawScene();
}

function initTexture()
{
    testTexture = gl.createTexture();
    testTexture.image = new Image();
    testTexture.image.src = "./test.png";
    testTexture.image.onload = function() {
      handleLoadedTexture(testTexture)
    }
}*/

function generateChart(data)
{
  var vertices = new Array();
  var texcoords = new Array();
  var numVerts = 0;
  var yMax = Math.max.apply(Math, data);
  var yMin = Math.min.apply(Math, data);

  for(var i=0;i<data.length-1;i++)
  {
    numVerts+=2;

    vertices.push((2.0/data.length)*i-1.0);
    vertices.push(2.0*(data[i]-yMin)/(yMax-yMin) - 1.0);
    vertices.push((2.0/data.length)*(i+1)-1.0);
    vertices.push(2.0*(data[i+1]-yMin)/(yMax-yMin) - 1.0);
  }
  return [vertices, numVerts];
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


function initBuffers()
{
  vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  var chart = generateChart(data);
  var vertices = chart[0];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  vertexBuffer.itemSize = 2;
  vertexBuffer.numItems = chart[1];

  colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

  var colors = [];
  for(var i=0;i<chart[1];i++)
  {
    colors = colors.concat([1.0, 1.0, 0.0, 1.0]);
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
  colorBuffer.itemSize = 4;
  colorBuffer.numItems = chart[1];
  return [vertices, colors];
}

function drawScene(vertices, colors)
{
  var shift_left = (1.0/200);
  for(var i=0;i<vertices.length;i+=2)
  {
    vertices[i]=vertices[i]-shift_left;
  }

  vertices.push(vertices[vertices.length-2], vertices[vertices.length-1], vertices[vertices.length-2]+shift_left, Math.random()*0.25-0.125);
  
  colors.push(0.0, 1.0, 0.0, 1.0);
  colors.push(0.0, 1.0, 0.0, 1.0);

  if(vertices.length >= (8/shift_left)) {
    vertices.splice(0, 4);
    colors.splice(0, 8);
  } 

  colorBuffer.numItems = Math.floor(colors.length/4);
  vertexBuffer.numItems = Math.floor(vertices.length/2);
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);    
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, colorBuffer.itemSize, gl.FLOAT, false, 0, 0);
  
  gl.uniform1i(shaderProgram.samplerUniform, 0);
  setMatrixUniforms();
  gl.drawArrays(gl.LINES, 0, colorBuffer.numItems);
}

function addDataPoint(timestamp, data)
{
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
  var buffers = initBuffers();
  var vertices = buffers[0];
  var colors = buffers[1];
  gl.clearColor(0.0,0.0,0.0,1.0);
  gl.enable(gl.DEPTH_TEST);
  initFontCanvas();
  fontTexture = initTextureFromCanvas('fontCanvas');
  gl.bindTexture(gl.TEXTURE_2D, fontTexture);
  (function animate() {
   window.requestAnimationFrame((function() {
       drawScene(vertices, colors);
       window.setTimeout(animate, 1000/60); // 1000/60
       }));
   })();
}
