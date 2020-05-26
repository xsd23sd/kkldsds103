// @see https://developer.mozilla.org/zh-CN/docs/Web/API/Node/nodeType
const NODE_TYPES = {
  ELEMENT_NODE: 1, //一个 元素 节点，例如 <p> 和 <div>。
  TEXT_NODE: 3, // Element 或者 Attr 中实际的  文字
  CDATA_SECTION_NODE: 4, //	一个 CDATASection，例如 <!CDATA[[ … ]]>。
  PROCESSING_INSTRUCTION_NODE: 7, //	一个用于XML文档的 ProcessingInstruction ，例如 <?xml-stylesheet ... ?> 声明。
  COMMENT_NODE: 8, //	一个 Comment 节点。
  // DOCUMENT_NODE: 9, //	一个 Document 节点。
  DOCUMENT_TYPE_NODE: 10 //	描述文档类型的 DocumentType 节点。例如 <!DOCTYPE html>  就是用于 HTML5 的。
  // DOCUMENT_FRAGMENT_NODE: 11 //	一个 DocumentFragment 节点
}

class Entity {
  /**
   * @type {NODE_TYPES}
   */
  type
  /**
   * @type {string}
   */
  data
  /**
   * @type {string}
   */
  _state
  /**
   * @type {string}
   */
  get state() {
    return this._state
  }

  /**
   *
   * @param {string} data
   */
  constructor(data) {
    this.type = this._getEntityType(data)
    if (this.type === NODE_TYPES.ELEMENT_NODE) {
      this._state = data[1] === '/' ? 'close' : 'open'
    }
    this.data = data
  }


  _getEntityType(data) {
    if (data.startsWith('<!--')) {
      return NODE_TYPES.COMMENT_NODE
    }
    if (data.startsWith('<!CDATA[[')) {
      return NODE_TYPES.CDATA_SECTION_NODE
    }
    if (data.startsWith('<?')) {
      return NODE_TYPES.PROCESSING_INSTRUCTION_NODE
    }
    if (/^<!doctype /i.test(data)) {
      return NODE_TYPES.DOCUMENT_TYPE_NODE
    }
    if (/^<[a-z_\-\/]/i.test(data)) {
      return NODE_TYPES.ELEMENT_NODE
    }

    return NODE_TYPES.TEXT_NODE
  }
}

class Document {
  /**
   * @type {Node}
   */
  doctype
  /**
   * @type {Node}
   */
  html
}

function decode(text, remove) {
  return text.replace(/_@#![0-9]+!#@_/g, (placeholder) => {
    const value = PLACEHOLDERS[placeholder]
    if (remove) {
      delete PLACEHOLDERS[placeholder]
    }
    return value
  })
}

class Node {
  /**
   *
   * @type {Node[]}
   */
  _children = []
  _raw = ''
  _isElement = false
  /**
   * @type {NODE_TYPES}
   */
  _type
  /**
   * @type {string}
   */
  _tag = ''
  /**
   * @type {{}}
   */
  _attrs = {}
  _closed = false
  _index = 0
  /**
   * @type {Node}
   */
  _parent

  /**
   *
   * @param {Entity} [entity]
   */
  constructor(entity) {
    if (!entity) {
      return
    }
    this._raw = entity.data
    this._type = entity.type
    this._isElement = entity.type === NODE_TYPES.ELEMENT_NODE

    if (this.isElement) {
      // 解析数据
      this._resolve(entity)
    }

    // 从 placeholder 中读取属性值
    this._raw = decode(decode(this._raw), true)
  }

  /**
   *
   * @param {Entity} [entity]
   */
  _resolve(entity) {
    const tagName = /^<([^\s>]+)/.exec(entity.data)[1]
    // 属性名称中可能包含变量
    this._tag = decode(tagName)

    // 读取属性，移除末尾的 > 符号和换行符
    const attrText = entity.data.substring(tagName.length + 1).replace(/[>\r\n]+$/, '')
    const attrReg = /(?<name>[^\s=]+)(=(?<value>[\S]*))?/ig

    let match
    while (true) {
      match = attrReg.exec(attrText)
      if (!match) {
        break
      }
      let value = PLACEHOLDERS[match.groups.value]
      // 属性值中可能包含变量
      this._attrs[match.groups.name] = decode(value)
    }
  }

  /**
   *
   * @param {Entity} [entity]
   */
  close(entity) {
    this._closed = true
  }

  /**
   *
   * @param {Node} node
   */
  appendChild(node) {
    node._parent = this
    node._index = this._children.length
    this._children.push(node)
  }

  /**
   *
   * @return {string}
   */
  get attrsString() {
    const temp = []
    for (const key in this._attrs) {
      temp.push(`${key}="${this._attrs[key]}"`)
    }

    return temp.length ? ` ${temp.join(' ')}` : ''
  }

  /**
   *
   * @param {boolean} includeChildren 是否包含子元素
   * @return {string}
   */
  toString(includeChildren) {
    // return this._raw

    if (this._type !== NODE_TYPES.ELEMENT_NODE) {
      return this._raw
    }

    if (!includeChildren) {
      return `<${this._tag}${this.attrsString}>`
    }
    const children = this._children.map(item => item.toString(true)).join('')

    return `<${this._tag}${this.attrsString}>${children}</${this._tag}>`
  }

  /**
   *
   * @return {boolean}
   */
  get isElement() {
    return this._type === NODE_TYPES.ELEMENT_NODE
  }

  /**
   *
   * @return {string}
   */
  get raw() {
    return this._raw
  }

  /**
   *
   * @return {Node[]}
   */
  get children() {
    return this._children
  }

  /**
   *
   * @return {boolean}
   */
  get closed() {
    return this._closed
  }

  /**
   *
   * @return {string}
   */
  get tag() {
    return this._tag
  }

  /**
   *
   * @return {{}}
   */
  get attrs() {
    return this._attrs
  }

  /**
   *
   * @return {NODE_TYPES}
   */
  get type() {
    return this._type
  }

  /**
   *
   * @return {Node}
   */
  get next() {
    return this._parent._children[this._index + 1]
  }

  /**
   *
   * @return {Node}
   */
  get nextElement() {
    const next = this.next
    if (next.isElement) {
      return next
    }
    return next.next
  }

  /**
   *
   * @return {Node}
   */
  get prev() {
    return this._parent._children[this._index - 1]
  }

  /**
   *
   * @return {Node}
   */
  get prevElement() {
    const next = this.next
    if (next.isElement) {
      return next
    }
    return next.next
  }

  /**
   *
   * @return {Node}
   */
  get parent() {
    return this._parent
  }
}

const PLACEHOLDERS = {}
let placeholderIndex = 0

function getPlaceholder() {
  placeholderIndex++
  return `_@#!${placeholderIndex}!#@_`
}

/**
 * 预处理
 * 替换内容中的html属性值
 * @param content
 */
function preProcess(content) {
  console.time(arguments.callee.name)
  content = content
    .replace(/\\./g, (input) => {
      // 处理 转义字符
      const p = getPlaceholder()
      PLACEHOLDERS[p] = input
      return p
    })
    .replace(/<(style|script)[\s\S]+?<\/\1>/ig, (input) => {
      // 处理 style 和 script 标签
      const p = getPlaceholder()
      PLACEHOLDERS[p] = input
      return p
    })
    .replace(/<(link|meta)[\s\S]+?>/ig, (input) => {
      // 处理 link 和 meta 标签
      const p = getPlaceholder()
      PLACEHOLDERS[p] = input
      return p
    })
    .replace(/\{\{[\s\S]+?\}\}/g, (input) => {
      // 处理 模板表达式
      const p = getPlaceholder()
      PLACEHOLDERS[p] = input
      return p
    }).replace(/=\s*(['"])([\s\S]*?)\1/g, (input, quote, value) => {
      // 处理 html 属性值
      const p = getPlaceholder()
      PLACEHOLDERS[p] = value
      return `=${p}`
    })
  console.timeEnd(arguments.callee.name)
  return content
}

function getNextEntity(content, offset) {
  const buffer = []

  let ltFound = false

  for (let i = offset; i < content.length; i++) {
    const char = content[i]
    if (char === '<') {
      // buffer 不为空，那么返回buffer内容
      if (buffer.length) {
        break
      }
      ltFound = true
      // 遇到 < 如果此时 buffer 为空，那么将其作为起始
      buffer.push(char)
      continue
    }

    if (char === '>') {
      // 如果已经遇到过 < ，此时遇到 > 就认为此标签闭合了
      if (ltFound) {
        buffer.push(char)
        break
      }
    }

    buffer.push(char)
  }

  return new Entity(buffer.join(''))
}

/**
 *
 * @param content
 * @return {Node[]}
 */
function parse(content) {
  console.time('parse')
  const tree = new Node()

  const stack = [tree]

  let currentNode = tree

  content = preProcess(content)

  const contentLength = content.length
  let index = 0

  while (index < contentLength) {
    const entity = getNextEntity(content, index)
    index += entity.data.length
    const node = new Node(entity)

    // 不是元素时，直接添加到 children 中
    if (entity.type !== NODE_TYPES.ELEMENT_NODE) {
      currentNode.appendChild(node)
      continue
    }

    // 是元素
    if (currentNode.closed) {
      if (entity.state === 'close') {
        // 此时的 state === close 直接丢弃
      }

      stack.push(currentNode)
      // 添加为兄弟元素
      currentNode.parent.appendChild(node)
      currentNode = node
      continue
    }

    // 当前元素未结束，又遇到新元素，那么就是下级了
    if (entity.state === 'open') {
      stack.push(currentNode)
      currentNode.appendChild(node)
      currentNode = node
      continue
    }

    // 元素结束
    currentNode.close(entity)
    currentNode = stack.pop()
  }
  console.timeEnd('parse')
  return tree.children
}

module.exports = {
  parse,
  NODE_TYPES
}