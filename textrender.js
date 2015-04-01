function TextRender(canvasElementID, mainCanvasElementID, shaderProgram, charWidth, charHeight)
{
  this.charWidth = charWidth;
  this.charHeight = charHeight;
  canvasTexture = gl.createTexture();
  this.textCanvas = $('#'+canvasElementID)[0]
  this.mainCanvas = $('#'+mainCanvasElementID)[0]
  this.texture = this.handleLoadedTexture(canvasTexture, this.textCanvas);
  this.shaderProgram = shaderProgram;
  this.initBuffers()
}

TextRender.prototype.handleLoadedTexture = function(texture, textureCanvas) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas); // This is the important line!
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  gl.generateMipmap(gl.TEXTURE_2D);

  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}

TextRender.prototype.initBuffers = function() {
  this.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

  var charWidthDisp = 2.0*this.charWidth/this.mainCanvas.width;
  var charHeightDisp = 2.0*this.charHeight/this.mainCanvas.height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0, 0, 
        charWidthDisp, 0, 
        0, charHeightDisp, 
        0, charHeightDisp, 
        charWidthDisp, 0, 
        charWidthDisp,  charHeightDisp]), gl.STATIC_DRAW);
  this.vertexBuffer.itemSize = 2;
  this.vertexBuffer.numItems = 6;

  this.textureBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
  var charWidthTexture = this.charWidth/this.textCanvas.width;
  var charHeightTexture = this.charHeight/this.textCanvas.height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0, 1.0-charHeightTexture, 
        charWidthTexture, 1.0-charHeightTexture, 
        0.0, 1.0, 
        0.0, 1.0, 
        charWidthTexture, 1.0-charHeightTexture, 
        charWidthTexture, 1.0]), gl.STATIC_DRAW);
  this.textureBuffer.itemSize = 2;
  this.textureBuffer.numItems = 6;
}

TextRender.prototype.renderCharacter = function(character, xPos, yPos) {
  gl.uniform1f(gl.getUniformLocation(this.shaderProgram, "character"), character.charCodeAt(0)-32);
  gl.uniform2f(gl.getUniformLocation(this.shaderProgram, "position"), xPos, yPos);
  gl.drawArrays(gl.TRIANGLES, 0, this.vertexBuffer.numItems);
}

TextRender.prototype.render = function(text, xPos, yPos, color) {
  gl.enable(gl.TEXTURE_2D);
  gl.useProgram(this.shaderProgram);
  gl.bindTexture(gl.TEXTURE_2D, this.texture); 
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
  gl.vertexAttribPointer(this.shaderProgram.vertexTextureAttribute, this.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.uniform1i(this.shaderProgram.samplerUniform, 0);
  //setMatrixUniforms(this.shaderProgram);
  gl.uniform4f(gl.getUniformLocation(this.shaderProgram, "color"), color.r, color.g, color.b, color.a);
  
  var charWidthDisp = 2.0*this.charWidth/this.mainCanvas.width; 
  while(text.length > 0) {
    this.renderCharacter(text, xPos, yPos);
    xPos += charWidthDisp;
    text=text.substring(1);
  }
}


