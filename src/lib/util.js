/*
 * wysiwyg web editor
 *
 * suneditor.js
 * Copyright 2017 JiHong Lee.
 * MIT license.
 */
'use strict';

/**
 * @description utility function
 */
const util = {
    _d: document,
    _w: window,
    _onlyZeroWidthRegExp: new RegExp('^' + String.fromCharCode(8203) + '+$'),

    /**
     * @description Removes attribute values such as style and converts tags that do not conform to the "html5" standard.
     * @param {String} text 
     * @returns {String}
     * @private
     */
    _tagConvertor: function (text) {
        const ec = {'b': 'strong', 'i': 'em', 'var': 'em', 'u': 'ins', 'strike': 'del', 's': 'del'};
        return text.replace(/\b(?<=<\/?)(pre|blockquote|h[1-6]|b|strong|var|i|em|u|ins|s|strike|del|sub|sup|ol|ul|dl|li|hr)\b\s*(?:[^>^<]+)?\s*(?=>)/ig, function (m, t) {
            return (typeof ec[t] === 'string') ? ec[t] : t;
        });
    },

    /**
     * @description Unicode Character 'ZERO WIDTH SPACE'
     */
    zeroWidthSpace: '\u200B',

    /**
     * @description A method that checks If the text is blank or to see if it contains only Unicode 'ZERO WIDTH SPACE' (\u200B)
     * @param {String} text - String value
     * @returns {Boolean}
     */
    onlyZeroWidthSpace: function (text) {
        return text === '' || this._onlyZeroWidthRegExp.test(text);
    },

    /**
     * @description Gets XMLHttpRequest object
     * @returns {Object}
     */
    getXMLHttpRequest: function () {
        /** IE */
        if (this._w.ActiveXObject) {
            try {
                return new ActiveXObject('Msxml2.XMLHTTP');
            } catch (e) {
                try {
                    return new ActiveXObject('Microsoft.XMLHTTP');
                } catch (e1) {
                    return null;
                }
            }
        }
        /** netscape */
        else if (this._w.XMLHttpRequest) {
            return new XMLHttpRequest();
        }
        /** fail */
        else {
            return null;
        }
    },

    /**
     * @description Create Element node
     * @param {String} elementName - Element name
     * @returns {Element}
     */
    createElement: function (elementName) {
        return this._d.createElement(elementName);
    },

    /**
     * @description Create text node
     * @param {String} text - text contents
     * @returns {Node}
     */
    createTextNode: function (text) {
        return this._d.createTextNode(text || '');
    },

    /**
     * @description Get the the tag path of the arguments value
     * If not found, return the first found value
     * @param {Array} nameArray - File name array
     * @param {String} extension - js, css
     * @returns {String}
     */
    getIncludePath: function (nameArray, extension) {
        let path = '';
        const pathList = [];
        const tagName = extension === 'js' ? 'script' : 'link';
        const src = extension === 'js' ? 'src' : 'href';
        
        let fileName = '(?:';
        for (let i = 0, len = nameArray.length; i < len; i++) {
            fileName += nameArray[i] + (i < len - 1 ? '|' : ')');
        }

        const regExp = new this._w.RegExp('(^|.*[\\/])' + fileName + '(\\.[^\\/]+)?\.' + extension + '(?:\\?.*|;.*)?$', 'i');
        const extRegExp = new this._w.RegExp('.+\\.' + extension + '(?:\\?.*|;.*)?$', 'i');
            
        for (let c = this._d.getElementsByTagName(tagName), i = 0; i < c.length; i++) {
            if (extRegExp.test(c[i][src])) {
                pathList.push(c[i]);
            }
        }

        for (let i = 0; i < pathList.length; i++) {
            let editorTag = pathList[i][src].match(regExp);
            if (editorTag) {
                path = editorTag[0];
                break;
            }
        }

        if (path === '') path = pathList.length > 0 ? pathList[0][src] : '';

        -1 === path.indexOf(':/') && '//' !== path.slice(0, 2) && (path = 0 === path.indexOf('/') ? location.href.match(/^.*?:\/\/[^\/]*/)[0] + path : location.href.match(/^[^\?]*\/(?:)/)[0] + path);

        if (!path) throw '[SUNEDITOR.util.getIncludePath.fail] The SUNEDITOR installation path could not be automatically detected. (name: +' + name + ', extension: ' + extension + ')';

        return path;
    },

    /**
     * @description Converts contents into a format that can be placed in an editor
     * @param {String} contents - contents
     * @returns {String}
     */
    convertContentsForEditor: function (contents) {
        let tag, baseHtml, innerHTML = '';
        contents = contents.trim();

        tag = this._d.createRange().createContextualFragment(contents).childNodes;

        for (let i = 0, len = tag.length; i < len; i++) {
            baseHtml = tag[i].outerHTML || tag[i].textContent;

            if (tag[i].nodeType === 3) {
                const textArray = baseHtml.split(/\n/g);
                let text = '';
                for (let t = 0, tLen = textArray.length; t < tLen; t++) {
                    text = textArray[t].trim();
                    if (text.length > 0) innerHTML += '<P>' + text + '</p>';
                }
            } else {
                innerHTML += baseHtml;
            }
        }

        const ec = {'&': '&amp;', '\u00A0': '&nbsp;', '\'': '&quot;', '<': '&lt;', '>': '&gt;'};
        contents = contents.replace(/&|\u00A0|'|<|>/g, function (m) {
            return (typeof ec[m] === 'string') ? ec[m] : m;
        });

        if (innerHTML.length === 0) innerHTML = '<p>' + (contents.length > 0 ? contents : this.zeroWidthSpace) + '</p>';

        return this._tagConvertor(innerHTML);
    },

    /**
     * @description Converts wysiwyg area element into a format that can be placed in an editor of code view mode
     * @param {Element} wysiwygDiv - WYSIWYG element (context.element.wysiwyg)
     * @returns {String}
     */
    convertHTMLForCodeView: function (wysiwygDiv) {
        let html = '';
        const reg = this._w.RegExp;

        (function recursionFunc (element) {
            const children = element.childNodes;

            for (let i = 0, len = children.length, node; i < len; i++) {
                node = children[i];
                if (/^(BLOCKQUOTE|TABLE|THEAD|TBODY|TR|OL|UL|FIGCAPTION)$/i.test(node.nodeName)) {
                    const tag = node.nodeName.toLowerCase();
                    html += node.outerHTML.match(reg('<' + tag + '[^>]*>', 'i'))[0] + '\n';
                    recursionFunc(node);
                    html += '</' + tag + '>\n';
                } else {
                    html += node.nodeType !== 1 ? /^\n+$/.test(node.data) ? '' : node.data : node.outerHTML + '\n';
                }
            }

        }(wysiwygDiv));

        return html;
    },

    /**
     * @description It is judged whether it is the edit region top div element.
     * @param {Element} element - The element to check
     * @returns {Boolean}
     */
    isWysiwygDiv: function (element) {
        if (element && element.nodeType === 1 && this.hasClass(element, 'sun-editor-id-wysiwyg')) return true;
        return false;
    },

    /**
     * @description It is judged whether it is the format element (P, DIV, H1-6, LI)
     * @param {Element} element - The element to check
     * @returns {Boolean}
     */
    isFormatElement: function (element) {
        if (element && element.nodeType === 1 && /^(P|DIV|H[1-6]|LI)$/i.test(element.nodeName)) return true;
        return false;
    },

    /**
     * @description It is judged whether it is the range format element. (BLOCKQUOTE, TABLE, THEAD, TBODY, TH, TR, TD, OL, UL, PRE)
     * * Range format element is wrap the format element  (P, DIV, H1-6, LI, CODE)
     * @param {Element} element - The element to check
     * @returns {Boolean}
     */
    isRangeFormatElement: function (element) {
        if (element && element.nodeType === 1 && /^(BLOCKQUOTE|TABLE|THEAD|TBODY|TR|TH|TD|OL|UL|PRE|FIGCAPTION)$/i.test(element.nodeName)) return true;
        return false;
    },

    /**
     * @description It is judged whether it is the component(img, iframe cover) element - "div.sun-editor-id-comp"
     * @param {Element} element - The element to check
     * @returns {Boolean}
     */
    isComponent: function (element) {
        return element && /sun-editor-id-comp/.test(element.className);
    },

    /**
     * @description If a parent node that contains an argument node finds a format node (P, DIV, H[1-6], LI), it returns that node.
     * @param {Element} element - Reference element if null or no value, it is relative to the current focus node.
     * @returns {Element}
     */
    getFormatElement: function (element) {
        if (!element) return null;

        while (element) {
            if (this.isWysiwygDiv(element)) return null;
            if (this.isRangeFormatElement(element)) element.firstElementChild;
            if (this.isFormatElement(element)) return element;

            element = element.parentNode;
        }
        
        return null;
    },

    /**
     * @description If a parent node that contains an argument node finds a format node (BLOCKQUOTE, TABLE, TR, TD, OL, UL, PRE), it returns that node.
     * @param {Element} element - Reference element if null or no value, it is relative to the current focus node.
     * @returns {Element|null}
     */
    getRangeFormatElement: function (element) {
        if (!element) return null;

        while (element) {
            if (this.isWysiwygDiv(element)) return null;
            if (this.isRangeFormatElement(element)) return element;
            element = element.parentNode;
        }

        return null;
    },

    /**
     * @description Get the index of the argument value in the element array
     * @param {array} array - element array
     * @param {Element} element - Element to find index
     * @returns {Number}
     */
    getArrayIndex: function (array, element) {
        let idx = -1;
        for (let i = 0, len = array.length; i < len; i++) {
            if (array[i] === element) {
                idx = i;
                break;
            }
        }

        return idx;
    },

    /**
     * @description Get the next index of the argument value in the element array
     * @param {array} array - element array
     * @param {Element} item - Element to find index
     * @returns {Number}
     */
    nextIdx: function (array, item) {
        let idx = this.getArrayIndex(array, item);
        if (idx === -1) return -1;
        return idx + 1;
    },

    /**
     * @description Get the previous index of the argument value in the element array
     * @param {array} array - element array
     * @param {Element} item - Element to find index
     * @returns {Number}
     */
    prevIdx: function (array, item) {
        let idx = this.getArrayIndex(array, item);
        if (idx === -1) return -1;
        return idx - 1;
    },

    /**
     * @description Get index from parent
     * @param {Element} element - Element
     * @returns {Number}
     */
    getPositionIndex: function (element) {
        let idx = 0;
        while (!!(element = element.previousSibling)) {
            idx += 1;
        }
        return idx;
    },

    /**
     * @description Check the node is a list (ol, ul)
     * @param {Element|String} node - Nodes to check
     * @returns {Boolean}
     */
    isList: function (node) {
        return node && /^(OL|UL)$/i.test(typeof node === 'string' ? node : node.nodeName);
    },

    /**
     * @description Check the node is a list cell (li)
     * @param {Element|String} node - Nodes to check
     * @returns {Boolean}
     */
    isListCell: function (node) {
        return node && /^LI$/i.test(typeof node === 'string' ? node : node.nodeName);
    },

    /**
     * @description Check the node is a table cell (td, th)
     * @param {Element|String} node - Nodes to check
     * @returns {Boolean}
     */
    isCell: function (node) {
        return node && /^(TD|TH)$/i.test(typeof node === 'string' ? node : node.nodeName);
    },

    /**
     * @description Check the node is a break node (BR)
     * @param {Element|String} node - Nodes to check
     * @returns {Boolean}
     */
    isBreak: function (node) {
        return node && /^BR$/i.test(typeof node === 'string' ? node : node.nodeName);
    },

    /**
     * @description Get all child nodes of the argument value element (Without text node)
     * @param {Element|String} element - element to get child node
     * @param {(function|null)} validation - Conditional function
     * @returns {Array}
     */
    getListChildren: function (element, validation) {
        const children = [];
        if (!element || !element.children) return children;

        validation = validation || function () { return true; };

        (function recursionFunc(current) {
            if (element !== current && validation(current)) {
                children.push(current);
            }

            for (let i = 0, len = current.children.length; i < len; i++) {
                recursionFunc(current.children[i]);
            }
        })(element);

        return children;
    },

    /**
     * @description Get all child nodes of the argument value element (Include text nodes)
     * @param {Element} element - element to get child node
     * @param {(function|null)} validation - Conditional function
     * @returns {Array}
     */
    getListChildNodes: function (element, validation) {
        const children = [];
        if (!element || !element.childNodes) return children;

        validation = validation || function () { return true; };

        (function recursionFunc(current) {
            if (element !== current && validation(current)) {
                children.push(current);
            }

            for (let i = 0, len = current.childNodes.length; i < len; i++) {
                recursionFunc(current.childNodes[i]);
            }
        })(element);

        return children;
    },

    /**
     * @description Get the parent element of the argument value.
     * A tag that satisfies the query condition is imported.
     * Returns null if not found.
     * @param {Node} element - Reference element
     * @param {String|Function} query - Query String (tagName, .className, #ID, :name) or validation function.
     * Not use it like jquery.
     * Only one condition can be entered at a time.
     * @returns {Element|null}
     */
    getParentElement: function (element, query) {
        let check;

        if (typeof query === 'function') {
            check = query;
        } else {
            let attr;
            if (/\./.test(query)) {
                attr = 'className';
                query = query.split('.')[1];
            } else if (/#/.test(query)) {
                attr = 'id';
                query = '^' + query.split('#')[1] + '$';
            } else if (/:/.test(query)) {
                attr = 'name';
                query = '^' + query.split(':')[1] + '$';
            } else {
                attr = 'tagName';
                query = '^' + query + '$';
            }

            const regExp = new this._w.RegExp(query, 'i');
            check = function (el) {
                return regExp.test(el[attr]);
            };
        }

        while (element && !check(element)) {
            if (this.isWysiwygDiv(element)) {
                return null;
            }
            element = element.parentNode;
        }

        return element;
    },

    /**
     * @description Get the child element of the argument value.
     * A tag that satisfies the query condition is imported.
     * Returns null if not found.
     * @param {Node} element - Reference element
     * @param {String|Function} query - Query String (tagName, .className, #ID, :name) or validation function.
     * Not use it like jquery.
     * Only one condition can be entered at a time.
     * @returns {Element|null}
     */
    getChildElement: function (element, query) {
        let check;

        if (typeof query === 'function') {
            check = query;
        } else {
            let attr;
            if (/\./.test(query)) {
                attr = 'className';
                query = query.split('.')[1];
            } else if (/#/.test(query)) {
                attr = 'id';
                query = '^' + query.split('#')[1] + '$';
            } else if (/:/.test(query)) {
                attr = 'name';
                query = '^' + query.split(':')[1] + '$';
            } else {
                attr = 'tagName';
                query = '^' + query + '$';
            }

            const regExp = new this._w.RegExp(query, 'i');
            check = function (el) {
                return regExp.test(el[attr]);
            };
        }

        const childList = this.getListChildren(element, function (current) {
            return check(current);
        });

        return childList[0];
    },

    /**
     * @description 1. The first node of all the child nodes of the "first" element is returned.
     * 2. The last node of all the child nodes of the "last" element is returned.
     * 3. When there is no "last" element, the first and last nodes of all the children of the "first" element are returned.
     * { sc: "first", ec: "last" }
     * @param {Element} first - First element
     * @param {Element|null} last - Last element
     * @returns {Object}
     */
    getEdgeChildNodes: function (first, last) {
        if (!first) return;
        if (!last) last = first;

        while (first && first.nodeType === 1 && !this.isBreak(first)) first = first.firstChild;
        while (last && last.nodeType === 1 && !this.isBreak(last)) last = last.lastChild;

        return {
            sc: first,
            ec: last || first
        };
    },

    /**
     * @description Returns the position of the left and top of argument. {left:0, top:0}
     * @param {Element} element - Element node
     * @returns {Object}
     */
    getOffset: function (element) {
        let tableOffsetLeft = 0;
        let tableOffsetTop = 0;
        let tableElement = element.nodeType === 3 ? element.parentElement : element;

        while (!this.isWysiwygDiv(tableElement.parentNode)) {
            if (/^(A|TD|TH|FIGURE|FIGCAPTION|IMG|IFRAME)$/i.test(tableElement.nodeName) || /relative/i.test(tableElement.style.position)) {
                tableOffsetLeft += tableElement.offsetLeft;
                tableOffsetTop += tableElement.offsetTop;
            }
            tableElement = tableElement.parentNode;
        }

        return {
            left: tableOffsetLeft,
            top: tableOffsetTop - tableElement.parentNode.scrollTop
        };
    },

    /**
     * @description Set the text content value of the argument value element
     * @param {Element} element - Element to replace text content
     * @param {String} txt - Text to be applied
     */
    changeTxt: function (element, txt) {
        if (!element || !txt) return;
        element.textContent = txt;
    },

    /**
     * @description Determine whether any of the matched elements are assigned the given class
     * @param {Element} element - Elements to search class name
     * @param {String} className - Class name to search for
     * @returns {Boolean}
     */
    hasClass: function (element, className) {
        if (!element) return;

        return element.classList.contains(className.trim());
    },

    /**
     * @description Append the className value of the argument value element
     * @param {Element} element - Elements to add class name
     * @param {String} className - Class name to be add
     */
    addClass: function (element, className) {
        if (!element) return;

        const check = new this._w.RegExp('(\\s|^)' + className + '(\\s|$)');
        if (check.test(element.className)) return;

        element.className += ' ' + className;
    },

    /**
     * @description Delete the className value of the argument value element
     * @param {Element} element - Elements to remove class name
     * @param {String} className - Class name to be remove
     */
    removeClass: function (element, className) {
        if (!element) return;

        const check = new this._w.RegExp('(\\s|^)' + className + '(\\s|$)');
        element.className = element.className.replace(check, ' ').trim();
    },

    /**
     * @description Argument value If there is no class name, insert it and delete the class name if it exists
     * @param {Element} element - Elements to replace class name
     * @param {String} className - Class name to be change
     */
    toggleClass: function (element, className) {
        if (!element) return;

        const check = new this._w.RegExp('(\\s|^)' + className + '(\\s|$)');
        if (check.test(element.className)) {
            element.className = element.className.replace(check, ' ').trim();
        }
        else {
            element.className += ' ' + className;
        }
    },

    /**
     * @description Delete argumenu value element
     * @param {Element} item - Element to be remove
     */
    removeItem: function (item) {
        try {
            item.remove();
        } catch (e) {
            item.parentNode.removeChild(item);
        }
    },

    /**
     * @description Delete a empty child node of argument element
     * @param {Element} element - Element node
     */
    removeEmptyNode: function (element) {
        (function recursionFunc(current) {
            if (current !== element && util.onlyZeroWidthSpace(current.textContent) && !/^BR$/i.test(current.nodeName) && (!current.firstChild || !/^BR$/i.test(current.firstChild.nodeName))) {
                if (current.parentNode) {
                    current.parentNode.removeChild(current);
                    return -1;
                }
            } else {
                const children = current.children;
                for (let i = 0, len = children.length, r = 0; i < len; i++) {
                    if (!children[i + r]) continue;
                    r += recursionFunc(children[i + r]);
                }
            }

            return 0;
        })(element);
    },

    /**
     * @description Gets the clean HTML code for editor
     * @param {String} html - HTML string
     */
    cleanHTML: function (html) {
        const tagsAllowed = new this._w.RegExp('^(meta|script|link|style|[a-z]+\:[a-z]+)$', 'i');
        const domTree = this._d.createRange().createContextualFragment(html).children;
        let cleanHTML = '';

        for (let i = 0, len = domTree.length; i < len; i++) {
            if (!tagsAllowed.test(domTree[i].nodeName)) {
                cleanHTML += domTree[i].outerHTML;
            }
        }

        cleanHTML = cleanHTML
            .replace(/<([a-zA-Z]+\:[a-zA-Z]+|script|style).*>(\n|.)*<\/([a-zA-Z]+\:[a-zA-Z]+|script|style)>/g, '')
            .replace(/(?<=<[a-z]+)\s+(?:style|class|id|name|width|height|index|for|dir|xmlns|contenteditable|on[a-zA-Z]|[a-z]+\-[a-z\-]+)\s*(?:=\s?"?[^>^"]*"?)?(?=[^<]*>)/g, '')
            .replace(this._deleteExclusionTags, '');

        return this._tagConvertor(cleanHTML || html);
    },

    /**
     * @description Delete Exclusion tags regexp object
     * @returns {Object}
     * @private
     */
    _deleteExclusionTags: (function () {
        const exclusionTags = 'br|p|div|pre|blockquote|h[1-6]|b|strong|u|i|var|em|strike|s|sub|sup|ol|ul|li|br|hr|a|img|iframe|table|thead|tbody|th|tr|td'.split('|');
        let regStr = '<\/?(';

        for (let i = 0, len = exclusionTags.length; i < len; i++) {
            regStr += '(?!\\b' + exclusionTags[i] + '\\b)';
        }

        regStr += '[^>^<])+>';

        return new RegExp(regStr, 'g');
    })()
};

export default util;