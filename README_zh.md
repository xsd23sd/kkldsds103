# wet

`wet` 简写自 `WEb Template`

`wet` 是一个基于 ES6 的简易服务器端 WEB 模板引擎，完全没有第三方依赖。

## Features

### `t-for`

执行 `for..of`(遍历数组) 和 `for..in`(遍历集合): `<t-for on="item of list">`，`item` 应该是一个合法的标识符

### `t-if`

条件: `<t-if on="condition">`，`condition` 应该是一个条件表达式

### `t-else`

条件: `<t-else>`

### `t-elif`

条件 `<t-elif on="condition">`，`condition` 应该是一个条件表达式

### `t-with`

设置作用域 `<t-with varName="a.b.c">`，在此范围内，`varName` 等于 `a.b.c` 的值，`varName` 应该是一个合法的标识符

### `t-tree`

树结构 `<t-tree on="tree as item">`:

- `tree` 是上下文中的树结构变量，其应该是一个数组(`array`, 以支持多个根结点) 
- `item` 是每个节点在此作用域内的变量名称

另外还有一个配合使用的标签 `<t-children field="children" />`

其 `field` 属性指定了子元素的字段名称，默认值为 `children`，即当字段名称为 `children` 时，属性 `field` 可省略

此标签标记子节点应该渲染的位置

### `t-include`

包含功能支持 `<t-include file="./another.html" />`

其属性 `file` 是一个相对文件路径，相对于当前文件的目录。

### `t-html`

提供直接渲染HTML的方法：`<t-html>{{'{{exp}}<p></p>{{exp}}'}}</t-html>`.

### `{{}}`

表达式支持: `{{var}}`, `{{obj.prop.value}}`, `{{a - b}}

## Sample

*demo.html*

```html
<div>
  <ul>
    <t-for on="item of list">
      <li>{{item}}</li>
    </t-for>
    <t-for on="item in set">
      <li>
        {{item.key}}: {{item.value}}
        <t-with xx="item.value.x.y">
          <span>{{xx.z}}</span>
        </t-with>
      </li>
    </t-for>
  </ul>
  <t-if on="visible">
    condition is true
  </t-if>
  <t-else>
    condition is false
  </t-else>
  <t-tree on="treeData as item">
    <div>
      {{item.data}}
      <div>
      	<t-children />    
      </div>
    </div>
  </t-tree>
  <t-include file="../common/footer.html" />
</div>
```

```javascript
const context = {
  list: [1, 2, 3],
  set: {
    a: 1,
    b: {
      x: {
        y: {z: 5}
      }
    },
    c: 3
  },
  visible: false
}
wet.render('./demo.html', context, {cache: true})
```

`context` 必须是对象，不能是数组