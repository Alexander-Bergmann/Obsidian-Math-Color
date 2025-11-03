var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MathColorPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var ColorValidator = class {
  static isValid(color) {
    if (!color?.trim()) return false;
    const t = color.trim();
    if (this.NAMED_COLORS[t.toLowerCase()]) return true;
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(t)) return true;
    const rgb = t.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (rgb) {
      const values = rgb.slice(1, 4).map((n) => parseInt(n));
      return values.every((v) => v >= 0 && v <= 255);
    }
    const rgba = t.match(/^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([\d.]+)\s*\)$/i);
    if (rgba) {
      const rgbValues = rgba.slice(1, 4).map((n) => parseInt(n));
      const alpha = parseFloat(rgba[4]);
      return rgbValues.every((v) => v >= 0 && v <= 255) && alpha >= 0 && alpha <= 1;
    }
    return false;
  }
  static normalize(color) {
    const t = color.trim();
    const named = this.NAMED_COLORS[t.toLowerCase()];
    if (named) return named;
    const short = t.match(/^#([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])$/);
    if (short) {
      return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toUpperCase();
    }
    return t.startsWith("#") ? t.toUpperCase() : t;
  }
  static toHex(color) {
    return this.NAMED_COLORS[color.trim().toLowerCase()] || this.normalize(color);
  }
};
__publicField(ColorValidator, "NAMED_COLORS", {
  red: "#DC143C",
  blue: "#1E90FF",
  green: "#32CD32",
  yellow: "#FFD700",
  orange: "#FF8C00",
  purple: "#9370DB",
  pink: "#FF69B4",
  brown: "#8B4513",
  black: "#000000",
  white: "#FFFFFF",
  gray: "#808080",
  grey: "#808080",
  cyan: "#00CED1",
  magenta: "#FF1493",
  lime: "#00FF00",
  navy: "#000080",
  teal: "#008080",
  olive: "#808000",
  maroon: "#800000",
  aqua: "#00FFFF",
  fuchsia: "#FF00FF",
  silver: "#C0C0C0",
  violet: "#EE82EE",
  indigo: "#4B0082"
});
var MathColorPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "blockCache", null);
    __publicField(this, "recentColors", []);
    __publicField(this, "fileModStamp", /* @__PURE__ */ new Map());
    __publicField(this, "modStampCounter", 0);
    __publicField(this, "lastMouseEvent", null);
  }
  async onload() {
    this.addCommand({
      id: "color-selected-math-variable",
      name: "Color selected math",
      editorCallback: (editor) => this.colorMathSelection(editor)
    });
    this.registerDomEvent(document, "contextmenu", (evt) => {
      this.lastMouseEvent = evt;
    }, { capture: true });
    this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor, view) => {
      const sel = editor.getSelection();
      let from = editor.getCursor("from");
      let to = editor.getCursor("to");
      if ((!sel || sel.length === 0) && this.lastMouseEvent && view instanceof import_obsidian.MarkdownView) {
        const editorView = this.getEditorView(view);
        if (editorView) {
          const pos = this.getPositionFromMouseEvent(editorView, this.lastMouseEvent);
          if (pos) {
            from = pos;
            to = pos;
          }
        }
      }
      const parsed = this.detectAndParseMath(editor, from, to, sel);
      menu.addItem((item) => {
        item.setSection("selection").setTitle("Math Color").setIcon("palette");
        if (!parsed.isValid) {
          item.setDisabled(true);
          return;
        }
        item.setSubmenu();
        const submenu = item.setSubmenu();
        const presets = [
          { name: "Red", color: "red" },
          { name: "Blue", color: "blue" },
          { name: "Green", color: "green" },
          { name: "Orange", color: "orange" },
          { name: "Purple", color: "purple" },
          { name: "Cyan", color: "cyan" },
          { name: "Magenta", color: "magenta" },
          { name: "Yellow", color: "yellow" }
        ];
        presets.forEach((preset) => {
          submenu.addItem((subItem) => {
            subItem.setTitle(preset.name);
            subItem.setIcon("circle");
            subItem.onClick(() => {
              const norm = ColorValidator.normalize(preset.color);
              this.recentColors = this.updateRecentColors(norm);
              this.applyColorToSegments(editor, parsed.segments, norm);
            });
          });
        });
        submenu.addSeparator();
        submenu.addItem((subItem) => {
          subItem.setTitle("Remove color");
          subItem.setIcon("x");
          subItem.onClick(() => {
            this.removeColorFromSegments(editor, parsed.segments);
          });
        });
        submenu.addSeparator();
        submenu.addItem((subItem) => {
          subItem.setTitle("More colors...");
          subItem.setIcon("palette");
          subItem.onClick(() => {
            this.openColorModal(editor, parsed.segments);
          });
        });
      });
    }));
    this.registerEvent(this.app.workspace.on("editor-change", () => {
      this.blockCache = null;
    }));
    this.registerEvent(this.app.vault.on("modify", (file) => {
      this.fileModStamp.set(file.path, Date.now());
      this.blockCache = null;
      this.modStampCounter++;
      if (this.modStampCounter >= 100) {
        this.modStampCounter = 0;
        this.clearOldModStamps();
      }
    }));
    this.registerEvent(this.app.vault.on("create", () => {
      this.blockCache = null;
    }));
    this.registerEvent(this.app.vault.on("rename", () => {
      this.blockCache = null;
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      this.fileModStamp.delete(file.path);
      this.blockCache = null;
    }));
  }
  getEditorView(view) {
    try {
      const editor = view.editor;
      if (editor && editor.cm) {
        return editor.cm;
      }
    } catch (e) {
      console.error("Failed to get EditorView:", e);
    }
    return null;
  }
  getPositionFromMouseEvent(editorView, event) {
    try {
      const pos = editorView.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos !== null && pos !== void 0) {
        const line = editorView.state.doc.lineAt(pos);
        return {
          line: line.number - 1,
          ch: pos - line.from
        };
      }
    } catch (e) {
      console.error("Failed to get position from mouse event:", e);
    }
    return null;
  }
  onunload() {
    this.blockCache = null;
    this.fileModStamp.clear();
  }
  detectAndParseMath(editor, from, to, sel) {
    const line = editor.getLine(from.line);
    const hasRealSelection = sel && sel.length > 0 && this.comparePositions(from, to) !== 0;
    const blocks = this.findAllMathBlocks(editor);
    for (let searchPos = 0; searchPos < line.length; searchPos++) {
      if (line.substring(searchPos, searchPos + 11) === "\\textcolor{") {
        const colorStart = searchPos + 11;
        const colorEnd = this.findMatchingBrace(line, colorStart - 1);
        if (colorEnd !== -1 && colorEnd + 1 < line.length && line[colorEnd + 1] === "{") {
          const contentStart = colorEnd + 2;
          const contentEnd = this.findMatchingBrace(line, colorEnd + 1);
          if (contentEnd !== -1) {
            const commandStart = searchPos;
            const commandEnd = contentEnd + 1;
            const cursorInCommand = !hasRealSelection && from.ch >= commandStart && from.ch <= commandEnd;
            const selectionOverlapsCommand = hasRealSelection && (from.ch >= commandStart && from.ch < commandEnd || to.ch > commandStart && to.ch <= commandEnd || from.ch <= commandStart && to.ch >= commandEnd);
            if (cursorInCommand || selectionOverlapsCommand) {
              for (const b of blocks) {
                const cs = this.getContentStart(b);
                const ce = this.getContentEnd(b, editor);
                const checkPos = { line: from.line, ch: commandStart };
                if (this.comparePositions(checkPos, cs) >= 0 && this.comparePositions(checkPos, ce) <= 0) {
                  const wholeText = line.substring(commandStart, commandEnd);
                  return {
                    isValid: true,
                    segments: [{
                      block: b,
                      startPos: { line: from.line, ch: commandStart },
                      endPos: { line: from.line, ch: commandEnd },
                      text: wholeText
                    }],
                    reason: void 0
                  };
                }
              }
            }
          }
        }
      }
    }
    if (hasRealSelection) {
      const selectionParsed = this.parseSelection(editor, from, to);
      if (selectionParsed.isValid) {
        return selectionParsed;
      }
      return { isValid: false, segments: [], reason: "Not in math" };
    }
    const blocksOnLine = blocks.filter((b) => b.startLine === from.line && b.endLine === from.line);
    if (blocksOnLine.length > 0) {
      let bestBlock = null;
      let minDist = Infinity;
      for (const b of blocksOnLine) {
        if (from.ch >= b.startCh && from.ch <= b.endCh) {
          bestBlock = b;
          minDist = 0;
          break;
        }
        let dist;
        if (from.ch < b.startCh) {
          dist = b.startCh - from.ch;
        } else {
          dist = from.ch - b.endCh;
        }
        if (dist < minDist) {
          minDist = dist;
          bestBlock = b;
        }
      }
      if (bestBlock && minDist <= 10) {
        const contentStart = this.getContentStart(bestBlock);
        const contentEnd = this.getContentEnd(bestBlock, editor);
        const contentText = editor.getRange(contentStart, contentEnd);
        if (contentText.length > 0) {
          return {
            isValid: true,
            segments: [{
              block: bestBlock,
              startPos: contentStart,
              endPos: contentEnd,
              text: contentText
            }],
            reason: void 0
          };
        }
      }
    }
    return { isValid: false, segments: [], reason: "Not in math" };
  }
  clearOldModStamps() {
    const now = Date.now();
    const maxAge = 3e5;
    for (const [path, timestamp] of this.fileModStamp.entries()) {
      if (now - timestamp > maxAge) {
        this.fileModStamp.delete(path);
      }
    }
  }
  updateRecentColors(newColor) {
    const updated = this.recentColors.filter((x) => x !== newColor);
    updated.unshift(newColor);
    if (updated.length > 8) updated.pop();
    return updated;
  }
  colorMathSelection(editor) {
    const sel = editor.getSelection();
    if (!sel) {
      new import_obsidian.Notice("No selection");
      return;
    }
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    const parsed = this.parseSelection(editor, from, to);
    if (!parsed.isValid) {
      new import_obsidian.Notice(parsed.reason || "Not in math");
      return;
    }
    this.openColorModal(editor, parsed.segments);
  }
  openColorModal(editor, segments) {
    new ColorInputModal(this.app, this.recentColors, (color, updatedRecent) => {
      const norm = ColorValidator.normalize(color);
      if (!ColorValidator.isValid(norm)) {
        new import_obsidian.Notice("Invalid color");
        return;
      }
      this.recentColors = updatedRecent;
      this.applyColorToSegments(editor, segments, norm);
    }).open();
  }
  unwrapAllColors(text) {
    let result = text;
    let maxIterations = 30;
    while (maxIterations-- > 0) {
      const startIdx = result.indexOf("\\textcolor{");
      if (startIdx === -1) break;
      const colorArgStart = startIdx + 11;
      const colorArgEnd = this.findMatchingBrace(result, colorArgStart - 1);
      if (colorArgEnd === -1) break;
      if (colorArgEnd + 1 >= result.length || result[colorArgEnd + 1] !== "{") {
        break;
      }
      const contentArgStart = colorArgEnd + 2;
      const contentArgEnd = this.findMatchingBrace(result, colorArgEnd + 1);
      if (contentArgEnd === -1) break;
      const before = result.substring(0, startIdx);
      const content = result.substring(contentArgStart, contentArgEnd);
      const after = result.substring(contentArgEnd + 1);
      result = before + content + after;
    }
    return result;
  }
  hasBalancedBraces(text) {
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      if (this.isEscapedAt(text, i)) continue;
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth < 0) return false;
      }
    }
    return depth === 0;
  }
  findMatchingBrace(text, openPos) {
    if (openPos < 0 || openPos >= text.length) return -1;
    if (text[openPos] !== "{") return -1;
    let depth = 1;
    let i = openPos + 1;
    while (i < text.length && depth > 0) {
      if (this.isEscapedAt(text, i)) {
        i++;
        continue;
      }
      if (text[i] === "{") {
        depth++;
      } else if (text[i] === "}") {
        depth--;
      }
      i++;
    }
    return depth === 0 ? i - 1 : -1;
  }
  isEscapedAt(str, bytePos) {
    if (bytePos === 0) return false;
    let backslashCount = 0;
    let i = bytePos - 1;
    while (i >= 0 && str[i] === "\\") {
      backslashCount++;
      i--;
    }
    return backslashCount % 2 === 1;
  }
  removeColorFromSegments(editor, segments) {
    if (!segments.length) return;
    const sorted = [...segments].sort((a, b) => this.comparePositions(a.startPos, b.startPos));
    const changes = sorted.slice().reverse().map((s) => {
      const cleanText = this.unwrapAllColors(s.text);
      return { from: s.startPos, to: s.endPos, text: cleanText };
    });
    editor.transaction({ changes });
    const firstSeg = sorted[0];
    const firstClean = this.unwrapAllColors(firstSeg.text);
    const newLen = this.getCharacterLength(firstClean);
    const selEnd = this.advancePosition(editor, firstSeg.startPos, newLen);
    editor.setSelection(firstSeg.startPos, selEnd);
    this.blockCache = null;
    new import_obsidian.Notice(`Removed color from ${segments.length} part${segments.length > 1 ? "s" : ""}`);
  }
  parseSelection(editor, from, to) {
    const blocks = this.findMathBlocksContainingSelection(editor, from, to);
    if (!blocks.length) return { isValid: false, segments: [], reason: "Not in math" };
    const segments = this.extractSelectionSegments(editor, from, to, blocks);
    if (!segments.length) return { isValid: false, segments: [], reason: "Not in math content" };
    for (const seg of segments) {
      const v = this.validateSegment(seg, editor);
      if (!v.isValid) return { isValid: false, segments: [], reason: v.reason || "Invalid" };
    }
    return { isValid: true, segments };
  }
  extractSelectionSegments(editor, from, to, blocks) {
    const segments = [];
    for (const block of blocks) {
      const start = this.getContentStart(block);
      const end = this.getContentEnd(block, editor);
      if (!this.rangesIntersect(from, to, start, end)) continue;
      let segStart = this.maxPosition(from, start);
      let segEnd = this.minPosition(to, end);
      let text = editor.getRange(segStart, segEnd);
      const lead = text.match(/^\s+/);
      if (lead) {
        segStart = this.advancePosition(editor, segStart, this.getCharacterLength(lead[1]));
        text = text.slice(lead[1].length);
      }
      const trail = text.match(/(\s+)$/);
      if (trail) {
        segEnd = this.rewindPosition(editor, segEnd, this.getCharacterLength(trail[1]));
        text = text.slice(0, -trail[1].length);
      }
      if (this.getCharacterLength(text) === 0) continue;
      segments.push({ block, startPos: segStart, endPos: segEnd, text });
    }
    return segments;
  }
  getCharacterLength(text) {
    return [...text].length;
  }
  advancePosition(editor, pos, charCount) {
    const lineCount = editor.lineCount();
    if (lineCount === 0) return { line: 0, ch: 0 };
    let { line, ch } = pos;
    let remaining = charCount;
    while (remaining > 0 && line < lineCount) {
      const lineText = editor.getLine(line);
      const afterCursor = lineText.substring(ch);
      const chars = [...afterCursor];
      if (remaining <= chars.length) {
        const targetChars = chars.slice(0, remaining);
        return { line, ch: ch + targetChars.join("").length };
      }
      remaining -= chars.length + 1;
      line++;
      ch = 0;
    }
    const lastLine = Math.min(line, lineCount - 1);
    const lastLineText = editor.getLine(lastLine);
    return { line: lastLine, ch: lastLineText.length };
  }
  rewindPosition(editor, pos, charCount) {
    const lineCount = editor.lineCount();
    if (lineCount === 0) return { line: 0, ch: 0 };
    let { line, ch } = pos;
    let remaining = charCount;
    while (remaining > 0 && line >= 0) {
      const lineText = editor.getLine(line);
      const beforeCursor = lineText.substring(0, ch);
      const chars = [...beforeCursor];
      if (remaining <= chars.length) {
        const keepChars = chars.slice(0, chars.length - remaining);
        return { line, ch: keepChars.join("").length };
      }
      remaining -= chars.length + 1;
      line--;
      if (line >= 0) {
        ch = editor.getLine(line).length;
      }
    }
    return { line: 0, ch: 0 };
  }
  getContentStart(block) {
    return block.isEnvironment ? { line: block.startLine + 1, ch: 0 } : { line: block.startLine, ch: block.startCh + (block.isDisplay ? 2 : 1) };
  }
  getContentEnd(block, editor) {
    if (block.isEnvironment) {
      const pattern = `\\end{${block.environmentType}}`;
      for (let ln = block.endLine; ln >= block.startLine; ln--) {
        const line2 = editor.getLine(ln);
        let idx2 = -1;
        while (true) {
          idx2 = line2.indexOf(pattern, idx2 + 1);
          if (idx2 === -1) break;
          if (!this.isEscapedAt(line2, idx2)) {
            return { line: ln, ch: idx2 };
          }
        }
      }
      const prev = block.endLine - 1;
      if (prev >= block.startLine && prev >= 0) {
        return { line: prev, ch: editor.getLine(prev).length };
      }
      return { line: block.startLine, ch: 0 };
    }
    const line = editor.getLine(block.endLine);
    const delim = block.isDisplay ? "$$" : "$";
    if (block.endLine === block.startLine) {
      const searchStart = block.startCh + delim.length;
      const idx2 = this.findUnescapedPattern(line.substring(searchStart), delim);
      return idx2 !== -1 ? { line: block.endLine, ch: searchStart + idx2 } : { line: block.endLine, ch: line.length };
    }
    const idx = this.findUnescapedPattern(line, delim);
    return idx !== -1 ? { line: block.endLine, ch: idx } : { line: block.endLine, ch: line.length };
  }
  validateSegment(seg, editor) {
    const text = seg.text;
    const charLen = this.getCharacterLength(text);
    if (charLen === 0) {
      return { isValid: false, reason: "Empty" };
    }
    const full = this.getBlockContentString(seg.block, editor);
    const start = this.getOffsetInBlock(seg.block, seg.startPos, editor);
    const end = start + charLen;
    const fullChars = [...full];
    const textChars = [...text];
    if (start > 0) {
      const before = fullChars[start - 1];
      if (before === "\\") {
        const bytePos = fullChars.slice(0, start - 1).join("").length;
        if (!this.isEscapedAt(full, bytePos)) {
          return { isValid: false, reason: "Partial command" };
        }
      }
      const first = textChars[0];
      if (first && /[a-zA-Z]/.test(first)) {
        let i = start - 1;
        while (i >= 0 && /[a-zA-Z]/.test(fullChars[i])) i--;
        if (i >= 0 && fullChars[i] === "\\") {
          const bytePos = fullChars.slice(0, i).join("").length;
          if (!this.isEscapedAt(full, bytePos)) {
            return { isValid: false, reason: "Cuts command" };
          }
        }
      }
    }
    if (text.match(/\\(?:\\)?\s+$/)) {
      if (!text.match(/\\\\$/)) {
        return { isValid: false, reason: "Incomplete command" };
      }
    }
    if (end < fullChars.length) {
      const lastIdx = textChars.length - 1;
      if (lastIdx >= 0 && /[a-zA-Z]/.test(textChars[lastIdx]) && /[a-zA-Z]/.test(fullChars[end])) {
        return { isValid: false, reason: "Cuts command" };
      }
    }
    const braces = this.checkBalancedBraces(text);
    if (!braces.isValid) return braces;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "$" && !this.isEscapedAt(text, i)) {
        return { isValid: false, reason: "Contains $" };
      }
    }
    return { isValid: true };
  }
  checkBalancedBraces(text) {
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      if (this.isEscapedAt(text, i)) continue;
      if (text[i] === "{") {
        depth++;
      } else if (text[i] === "}") {
        depth--;
        if (depth < 0) {
          return { isValid: false, reason: "Unmatched }" };
        }
      }
    }
    return depth === 0 ? { isValid: true } : { isValid: false, reason: `Unclosed { (${depth})` };
  }
  getBlockContentString(block, editor) {
    return editor.getRange(this.getContentStart(block), this.getContentEnd(block, editor));
  }
  getOffsetInBlock(block, pos, editor) {
    const start = this.getContentStart(block);
    if (pos.line === start.line) {
      const lineText = editor.getLine(pos.line);
      const segment = lineText.substring(start.ch, pos.ch);
      return this.getCharacterLength(segment);
    }
    let offset = 0;
    const firstLine = editor.getLine(start.line);
    const firstChars = [...firstLine.substring(start.ch)];
    offset += firstChars.length + 1;
    for (let l = start.line + 1; l < pos.line; l++) {
      const lineChars = [...editor.getLine(l)];
      offset += lineChars.length + 1;
    }
    const lastLine = editor.getLine(pos.line);
    const lastChars = [...lastLine.substring(0, pos.ch)];
    offset += lastChars.length;
    return offset;
  }
  rangesIntersect(a1, a2, b1, b2) {
    return this.comparePositions(a1, b2) < 0 && this.comparePositions(b1, a2) < 0;
  }
  findMathBlocksContainingSelection(editor, from, to) {
    return this.findAllMathBlocks(editor).filter((b) => {
      const s = this.getContentStart(b);
      const e = this.getContentEnd(b, editor);
      return this.rangesIntersect(from, to, s, e);
    });
  }
  findAllMathBlocks(editor) {
    const content = editor.getValue();
    const hash = this.computeContentHash(content);
    const cacheKey = `${editor.lineCount()}:${content.length}:${hash}`;
    if (this.blockCache?.contentHash === cacheKey) {
      return this.blockCache.blocks;
    }
    const blocks = [];
    const lines = editor.lineCount();
    let inDisplay = false;
    let inBracketDisplay = false;
    let displayStart = null;
    let bracketDisplayStart = null;
    let displayContent = [];
    let bracketDisplayContent = [];
    const envStack = [];
    const envPat = /\\(begin|end)\{(equation|align|gather|multline|alignat|flalign|eqnarray|split|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|smallmatrix|array)\*?}/g;
    for (let ln = 0; ln < lines; ln++) {
      let line = editor.getLine(ln);
      const commentIdx = this.findUnescapedPattern(line, "%");
      if (commentIdx !== -1) {
        line = line.substring(0, commentIdx);
      }
      const matches = Array.from(line.matchAll(envPat));
      for (const m of matches) {
        const isBegin = m[1] === "begin";
        const type = m[2];
        const idx = m.index;
        if (isBegin) {
          envStack.push({ type, startLine: ln, startCh: idx, content: [] });
        } else if (envStack.length > 0 && envStack[envStack.length - 1].type === type) {
          const env = envStack.pop();
          blocks.push({
            startLine: env.startLine,
            startCh: env.startCh,
            endLine: ln,
            endCh: idx + m[0].length,
            isDisplay: true,
            isEnvironment: true,
            environmentType: env.type,
            content: env.content.join("\n")
          });
        }
      }
      if (envStack.length > 0) {
        envStack.forEach((e) => e.content.push(line));
        continue;
      }
      if (inBracketDisplay) {
        const close = this.findUnescapedPattern(line, "\]");
        if (close !== -1) {
          bracketDisplayContent.push(line.substring(0, close));
          blocks.push({
            startLine: bracketDisplayStart.line,
            startCh: bracketDisplayStart.ch,
            endLine: ln,
            endCh: close + 2,
            isDisplay: true,
            isEnvironment: false,
            content: bracketDisplayContent.join("\n")
          });
          inBracketDisplay = false;
          bracketDisplayStart = null;
          bracketDisplayContent = [];
          this.findInlineMathInLine(line.substring(close + 2), ln, close + 2, blocks);
        } else {
          bracketDisplayContent.push(line);
        }
        continue;
      }
      const bracketOpen = this.findUnescapedPattern(line, "\[");
      if (bracketOpen !== -1) {
        this.findInlineMathInLine(line.substring(0, bracketOpen), ln, 0, blocks);
        const after = line.substring(bracketOpen + 2);
        const bracketClose = this.findUnescapedPattern(after, "\]");
        if (bracketClose !== -1) {
          blocks.push({
            startLine: ln,
            startCh: bracketOpen,
            endLine: ln,
            endCh: bracketOpen + 2 + bracketClose + 2,
            isDisplay: true,
            isEnvironment: false,
            content: after.substring(0, bracketClose)
          });
          this.findInlineMathInLine(line.substring(bracketOpen + 2 + bracketClose + 2), ln, bracketOpen + 2 + bracketClose + 2, blocks);
        } else {
          inBracketDisplay = true;
          bracketDisplayStart = { line: ln, ch: bracketOpen };
          bracketDisplayContent = [after];
        }
        continue;
      }
      if (inDisplay) {
        const close = this.findUnescapedPattern(line, "$$");
        if (close !== -1) {
          displayContent.push(line.substring(0, close));
          blocks.push({
            startLine: displayStart.line,
            startCh: displayStart.ch,
            endLine: ln,
            endCh: close + 2,
            isDisplay: true,
            isEnvironment: false,
            content: displayContent.join("\n")
          });
          inDisplay = false;
          displayStart = null;
          displayContent = [];
          this.findInlineMathInLine(line.substring(close + 2), ln, close + 2, blocks);
        } else {
          displayContent.push(line);
        }
      } else {
        const open = this.findUnescapedPattern(line, "$$");
        if (open !== -1) {
          this.findInlineMathInLine(line.substring(0, open), ln, 0, blocks);
          const after = line.substring(open + 2);
          const close = this.findUnescapedPattern(after, "$$");
          if (close !== -1) {
            blocks.push({
              startLine: ln,
              startCh: open,
              endLine: ln,
              endCh: open + 2 + close + 2,
              isDisplay: true,
              isEnvironment: false,
              content: after.substring(0, close)
            });
            this.findInlineMathInLine(line.substring(open + 2 + close + 2), ln, open + 2 + close + 2, blocks);
          } else {
            inDisplay = true;
            displayStart = { line: ln, ch: open };
            displayContent = [after];
          }
        } else {
          this.findInlineMathInLine(line, ln, 0, blocks);
        }
      }
    }
    if (inDisplay && displayStart) {
      blocks.push({
        startLine: displayStart.line,
        startCh: displayStart.ch,
        endLine: lines - 1,
        endCh: editor.getLine(lines - 1).length,
        isDisplay: true,
        isEnvironment: false,
        content: displayContent.join("\n")
      });
    }
    if (inBracketDisplay && bracketDisplayStart) {
      blocks.push({
        startLine: bracketDisplayStart.line,
        startCh: bracketDisplayStart.ch,
        endLine: lines - 1,
        endCh: editor.getLine(lines - 1).length,
        isDisplay: true,
        isEnvironment: false,
        content: bracketDisplayContent.join("\n")
      });
    }
    while (envStack.length > 0) {
      const e = envStack.pop();
      blocks.push({
        startLine: e.startLine,
        startCh: e.startCh,
        endLine: lines - 1,
        endCh: editor.getLine(lines - 1).length,
        isDisplay: true,
        isEnvironment: true,
        environmentType: e.type,
        content: e.content.join("\n")
      });
    }
    this.blockCache = { blocks, contentHash: cacheKey };
    return blocks;
  }
  findInlineMathInLine(line, ln, offset, blocks) {
    let i = 0;
    while (i < line.length) {
      if (line[i] === "$" && !this.isEscapedAt(line, i)) {
        if (i + 1 < line.length && line[i + 1] === "$" || i > 0 && line[i - 1] === "$") {
          i++;
          continue;
        }
        const start = i;
        i++;
        let closed = false;
        while (i < line.length) {
          if (line[i] === "$" && !this.isEscapedAt(line, i)) {
            if (i + 1 < line.length && line[i + 1] === "$") {
              i++;
              continue;
            }
            blocks.push({
              startLine: ln,
              startCh: offset + start,
              endLine: ln,
              endCh: offset + i + 1,
              isDisplay: false,
              isEnvironment: false,
              content: line.substring(start + 1, i)
            });
            closed = true;
            break;
          }
          i++;
        }
        if (!closed) {
          blocks.push({
            startLine: ln,
            startCh: offset + start,
            endLine: ln,
            endCh: offset + line.length,
            isDisplay: false,
            isEnvironment: false,
            content: line.substring(start + 1)
          });
        }
      }
      i++;
    }
  }
  findUnescapedPattern(str, pat) {
    for (let i = 0; i <= str.length - pat.length; i++) {
      if (str.substring(i, i + pat.length) === pat && !this.isEscapedAt(str, i)) {
        return i;
      }
    }
    return -1;
  }
  computeContentHash(str) {
    if (!str) return "0";
    let hash = 2166136261;
    for (const codePoint of str) {
      const code = codePoint.codePointAt(0);
      if (code !== void 0) {
        hash ^= code;
        hash = Math.imul(hash, 16777619);
      }
    }
    return (hash >>> 0).toString(36);
  }
  applyColorToSegments(editor, segments, color) {
    if (!segments.length) return;
    const sorted = [...segments].sort((a, b) => this.comparePositions(a.startPos, b.startPos));
    const unwrappedSegments = sorted.map((s) => ({
      segment: s,
      unwrapped: this.unwrapAllColors(s.text)
    }));
    for (const { unwrapped } of unwrappedSegments) {
      if (unwrapped.includes("$")) {
        new import_obsidian.Notice("Cannot color: contains $"
      );
        return;
      }
      if (unwrapped.includes("\\[") || unwrapped.includes("\\]")) {
        new import_obsidian.Notice("Cannot color: contains \\[ or \\]"
      );
        return;
      }
      if (unwrapped.match(/\\begin\{/) || unwrapped.match(/\\end\{/)) {
        new import_obsidian.Notice("Cannot color: contains \\begin or \\end"
      );
        return;
      }
      if (!this.hasBalancedBraces(unwrapped)) {
        new import_obsidian.Notice("Cannot color: unbalanced braces"
      );
        return;
      }
    }
    const changes = unwrappedSegments.slice().reverse().map(({ segment, unwrapped }) => {
      const colored2 = `\\textcolor{${color}}{${unwrapped}}`;
      return {
        from: segment.startPos,
        to: segment.endPos,
        text: colored2
      };
    });
    editor.transaction({ changes });
    const firstSeg = sorted[0];
    const firstUnwrapped = unwrappedSegments[0].unwrapped;
    const colored = `\\textcolor{${color}}{${firstUnwrapped}}`;
    const newLen = this.getCharacterLength(colored);
    editor.setSelection(firstSeg.startPos, this.advancePosition(editor, firstSeg.startPos, newLen));
    this.blockCache = null;
    new import_obsidian.Notice(`Applied ${color} to ${segments.length} part${segments.length > 1 ? "s" : ""}`);
  }
  comparePositions(a, b) {
    if (a.line !== b.line) return a.line - b.line;
    if (a.ch !== b.ch) return a.ch - b.ch;
    return 0;
  }
  maxPosition(a, b) {
    return this.comparePositions(a, b) >= 0 ? a : b;
  }
  minPosition(a, b) {
    return this.comparePositions(a, b) <= 0 ? a : b;
  }
};
var ColorInputModal = class extends import_obsidian.Modal {
  constructor(app, recentColors, onSubmit) {
    super(app);
    __publicField(this, "onSubmitCallback");
    __publicField(this, "recentColors");
    __publicField(this, "input");
    __publicField(this, "msg");
    __publicField(this, "picker");
    __publicField(this, "syncing", false);
    this.recentColors = [...recentColors];
    this.onSubmitCallback = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Math Color" });
    const inputDiv = contentEl.createDiv();
    inputDiv.style.marginBottom = "8px";
    this.input = inputDiv.createEl("input", {
      type: "text",
      placeholder: "red, #FF5733, rgb(255,0,0)"
    });
    Object.assign(this.input.style, {
      width: "100%",
      padding: "10px",
      fontSize: "14px",
      border: "2px solid var(--background-modifier-border)",
      borderRadius: "6px"
    });
    this.msg = contentEl.createEl("div", { cls: "mod-warning" });
    Object.assign(this.msg.style, {
      fontSize: "12px",
      marginBottom: "12px",
      minHeight: "18px"
    });
    if (this.recentColors.length > 0) {
      this.input.value = this.recentColors[0];
    }
    this.input.addEventListener("input", () => {
      if (!this.syncing) this.onTextChange();
    });
    const pickerDiv = contentEl.createDiv();
    Object.assign(pickerDiv.style, {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "12px",
      background: "var(--background-secondary)",
      borderRadius: "6px",
      marginBottom: "16px"
    });
    this.picker = pickerDiv.createEl("input", { type: "color" });
    Object.assign(this.picker.style, {
      width: "54px",
      height: "38px",
      cursor: "pointer",
      border: "none",
      borderRadius: "6px"
    });
    this.picker.value = this.getHex(this.recentColors[0] || "");
    this.picker.addEventListener("input", () => {
      if (!this.syncing && this.input) {
        this.syncing = true;
        this.input.value = this.picker.value;
        this.validate();
        this.syncing = false;
      }
    });
    pickerDiv.createEl("span", {
      text: "Custom color",
      attr: { style: "font-size:13px;color:var(--text-muted);flex:1" }
    });
    if (this.recentColors.length > 0) {
      this.renderRecent(contentEl);
    }
    this.renderPresets(contentEl);
    const btns = contentEl.createDiv();
    Object.assign(btns.style, {
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px",
      marginTop: "8px"
    });
    const ok = btns.createEl("button", { text: "Apply", cls: "mod-cta" });
    ok.style.cssText = "padding:10px 24px;cursor:pointer;font-weight:600";
    ok.onclick = () => this.submit();
    const cancel = btns.createEl("button", { text: "Cancel" });
    cancel.style.cssText = "padding:10px 24px;cursor:pointer";
    cancel.onclick = () => this.close();
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.submit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
    });
    this.input.focus();
    this.input.select();
    this.validate();
  }
  getHex(text) {
    if (!text) return "#1E90FF";
    try {
      const h = ColorValidator.toHex(text);
      return /^#[0-9A-Fa-f]{6}$/i.test(h) ? h : "#1E90FF";
    } catch {
      return "#1E90FF";
    }
  }
  onTextChange() {
    if (!this.input || !this.picker) return;
    this.validate();
    const v = this.input.value.trim();
    if (ColorValidator.isValid(v)) {
      try {
        const h = ColorValidator.toHex(v);
        if (/^#[0-9A-Fa-f]{6}$/i.test(h)) {
          this.syncing = true;
          this.picker.value = h;
          this.syncing = false;
        }
      } catch {
      }
    }
  }
  validate() {
    if (!this.input || !this.msg) return false;
    const v = this.input.value.trim();
    if (!v) {
      this.input.style.borderColor = "var(--background-modifier-border)";
      this.msg.textContent = "";
      return false;
    }
    if (ColorValidator.isValid(v)) {
      this.input.style.borderColor = "var(--interactive-success)";
      this.msg.style.color = "var(--interactive-success)";
      this.msg.textContent = "✓ Valid";
      return true;
    } else {
      this.input.style.borderColor = "var(--text-error)";
      this.msg.style.color = "var(--text-error)";
      this.msg.textContent = "✗ Invalid color";
      return false;
    }
  }
  updateRecentColors(newColor) {
    const updated = this.recentColors.filter((x) => x !== newColor);
    updated.unshift(newColor);
    if (updated.length > 8) updated.pop();
    this.recentColors = updated;
    return updated;
  }
  renderRecent(el) {
    el.createEl("div", {
      text: "RECENT",
      attr: {
        style: "font-size:11px;color:var(--text-muted);margin:4px 0 6px;font-weight:600"
      }
    });
    const div = el.createDiv();
    Object.assign(div.style, {
      display: "flex",
      gap: "6px",
      flexWrap: "wrap",
      marginBottom: "16px"
    });
    this.recentColors.forEach((c) => {
      const b = div.createEl("button", { text: c });
      Object.assign(b.style, {
        padding: "6px 12px",
        fontSize: "12px",
        cursor: "pointer",
        borderRadius: "12px",
        border: "1px solid var(--background-modifier-border)",
        background: "var(--background-secondary)",
        fontFamily: "var(--font-monospace)"
      });
      b.onmouseenter = () => Object.assign(b.style, {
        background: "var(--background-modifier-hover)",
        transform: "scale(1.05)",
        transition: "all 0.1s ease"
      });
      b.onmouseleave = () => Object.assign(b.style, {
        background: "var(--background-secondary)",
        transform: "scale(1)",
        transition: "all 0.1s ease"
      });
      b.onclick = () => this.useColor(c);
    });
  }
  renderPresets(el) {
    el.createEl("div", {
      text: "PRESETS",
      attr: {
        style: "font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:600"
      }
    });
    const grid = el.createDiv();
    grid.style.cssText = "display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px";
    const presets = [
      { name: "red", hex: "#DC143C" },
      { name: "blue", hex: "#1E90FF" },
      { name: "green", hex: "#32CD32" },
      { name: "orange", hex: "#FF8C00" },
      { name: "purple", hex: "#9370DB" },
      { name: "cyan", hex: "#00CED1" },
      { name: "magenta", hex: "#FF1493" },
      { name: "teal", hex: "#008080" }
    ];
    presets.forEach((p) => {
      const b = grid.createEl("button");
      b.style.cssText = "padding:10px;cursor:pointer;border-radius:6px;border:2px solid var(--background-modifier-border);background:var(--background-primary);display:flex;align-items:center;gap:8px;font-size:13px";
      b.createEl("div", {
        attr: {
          style: `width:18px;height:18px;border-radius:50%;background:${p.hex};border:2px solid var(--background-modifier-border);flex-shrink:0`
        }
      });
      b.createEl("span", { text: p.name });
      b.onmouseenter = () => Object.assign(b.style, {
        background: "var(--background-modifier-hover)",
        transform: "translateY(-2px)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        transition: "all 0.2s ease"
      });
      b.onmouseleave = () => Object.assign(b.style, {
        background: "var(--background-primary)",
        transform: "translateY(0)",
        boxShadow: "none",
        transition: "all 0.2s ease"
      });
      b.onclick = () => this.useColor(p.name);
    });
  }
  submit() {
    const v = this.input?.value.trim();
    if (v && ColorValidator.isValid(v)) {
      this.useColor(v);
    } else {
      new import_obsidian.Notice("Invalid color format");
    }
  }
  useColor(c) {
    const normalized = ColorValidator.normalize(c);
    const updated = this.updateRecentColors(normalized);
    this.close();
    this.onSubmitCallback(normalized, updated);
  }
  onClose() {
    this.contentEl.empty();
  }
};