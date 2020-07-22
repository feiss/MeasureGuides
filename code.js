
function isObject(obj){
  return [
  "SLICE",
  "FRAME",
  "GROUP",
  "COMPONENT",
  "INSTANCE",
  "BOOLEAN_OPERATION",
  "VECTOR",
  "STAR",
  "LINE",
  "ELLIPSE",
  "POLYGON",
  "RECTANGLE",
  "TEXT"].indexOf(obj.type) !== -1;
}

function trimDecimals(value) {
  return Math.floor(value * 100) / 100;
}

function addTextLabel(x, y, value, width, height){
  let text = figma.createText();
  text.x = x;
  text.y = y;
  text.fontName = {family: "Open Sans", style: "Regular"};
  text.characters = value;
  text.resize(width || text.width, height || text.height);
  text.textAlignHorizontal = "CENTER";
  text.textAlignVertical = "CENTER";
  return text;
}

function setFillColor(obj, color){
  const fills = JSON.parse(JSON.stringify(obj.fills));
  fills[0].color.r = color.r;
  fills[0].color.g = color.g;
  fills[0].color.b = color.b;
  obj.fills = fills;
}

function setStrokeColor(obj, color){
  const strokes = JSON.parse(JSON.stringify(obj.strokes));
  strokes[0].color.r = color.r;
  strokes[0].color.g = color.g;
  strokes[0].color.b = color.b;
  obj.strokes = strokes;
}

function makeRGB(c){
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(c);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : null;
}

function addMeasure(obj, cfg){
  const where = cfg.where;
  const margin = cfg.margin;
  const textMargin = cfg.textMargin;
  const useColor = cfg.color;
  const fontSize = cfg.fontSize;

  let line = figma.createLine();
  const vertical = where == 'E' || where == 'W';
  const horizontal = !vertical;
  line.x = obj.x;
  line.y = obj.y;
  if (where == 'N') line.y -= margin;
  if (where == 'S') line.y += obj.height + margin;
  if (where == 'E') line.x += obj.width + margin;
  if (where == 'W') line.x -= margin;

  line.resize(horizontal ? obj.width : obj.height, 0);
  line.rotation = vertical ? -90 : 0;

  let text = addTextLabel(
    line.x + (vertical   ? textMargin : 0) * (where == 'W' ? -1 : 1),
    line.y + (horizontal ? textMargin : 0) * (where == 'N' ? -1 : 1),
    '' + (horizontal ? trimDecimals(obj.width) : trimDecimals(obj.height)),
    horizontal ? line.width : null,
    vertical ? line.width : null);

  text.fontSize = fontSize;

  if (where == 'N') text.y -= text.height;
  if (where == 'W') text.x -= text.width;

  const color = useColor === null ? obj.fills[0].color : makeRGB(useColor);
  setFillColor(text, color);
  setStrokeColor(line, color);

  return [line, text];
}

function start(cfg){
  let objs = [];
  const sel = figma.currentPage.selection;
  for (var i = 0; i < sel.length; i++) {
    let obj = sel[i];
    if (!isObject(obj)) continue;
    objs = objs.concat(addMeasure(obj, cfg));
  }
  var measures = figma.currentPage.findOne(node => node.type=='GROUP' && node.name == 'measures');
  if (measures) {
    for (var i = 0; i < objs.length; i++) {
      measures.appendChild(objs[i]);
    }
  } else {
    measures = figma.group(objs, objs[0].parent);
    measures.name = 'measures';
  }
//  figma.currentPage.selection = [measures];
//  figma.closePlugin();
}



figma.showUI(__html__, {width: 190, height: 340});

figma.ui.onmessage = msg => {
  if (msg.type === 'create-guides') {
    if (figma.currentPage.selection.length == 0){
      alert ('No objects selected');
      return;
    }
    let cfg = msg;
    figma.loadFontAsync({
      family: "Open Sans", style: "Regular"
    }).then(()=>start(cfg), ()=>{})
  }
  else if (msg.type === 'cancel') {
    figma.closePlugin();
  }
  else if (msg.type === 'delete') {
    const groups = figma.currentPage.findAll(node => node.type=='GROUP' && node.name == 'measures');
    for (let i in groups){
      groups[i].remove();
    }
  }
};
