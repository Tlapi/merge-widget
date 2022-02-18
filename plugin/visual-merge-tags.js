(function() {
	'use strict';
	tinymce.PluginManager.add('visualMergeTags', function(editor, url) {
		var mergeTagStyle = editor.getParam('merge_tag_style', {
			'cursor': 'pointer',
			'user-select': 'none',
			'background-color': '#EFEFEF',
			'color': 'black',
			'border': '1px solid #CCCCCC',
			'font-size': 'inherit',
			'font-style': 'normal',
			'font-weight': 'normal',
			'text-decoration': 'none',
			'padding': '4px 8px',
			'border-radius': '6px',
			'font-weight': 'normal',
			'box-sizing': 'border-box'
		});

		var mergeTags = editor.getParam('merge_tags', {});

		var makeMergeTag = function(tagType) {
			var tag = editor.dom.create('span', {}, mergeTags[tagType]);
			tag.classList.add('merge-tag');
			tag.contentEditable = false;
			tag.dataset.tagtype = tagType;

			for (var styleProp in mergeTagStyle) {
				tag.style.setProperty(styleProp, mergeTagStyle[styleProp]);
			}

			return tag;
		};

		editor.on('BeforeExecCommand', function(event) {
			var formatCommands = [
				'mceToggleFormat',
				'FontSize',
				'FontName',
				'Bold',
				'Italic',
				'Underline',
				'mceApplyTextcolor',
				'mceRemoveTextcolor'
			];

			if (
				event.command
				&& event.command === 'mceInsertContent'
				&& event.value
				&& event.value.length > 4
				&& event.value.substring(0, 2) === '*|'
				&& event.value.substring(event.value.length - 2) === '|*'
			) {
				event.preventDefault();
				
				if (!editor.selection.isCollapsed()) {
					editor.selection.setContent('');
					editor.selection.collapse();
				}

				var insertedTag = event.value.substring(2, event.value.length - 2);

				var tag = makeMergeTag(insertedTag);

				var range = editor.selection.getRng().cloneRange();
				range.insertNode(tag);
				range.setStartAfter(tag);

				editor.selection.setRng(range);
			} else if (formatCommands.indexOf(event.command) >= 0) {
				var mergeTagElements = editor.getBody().querySelectorAll('span.merge-tag');
				for (var mergeTag of mergeTagElements) {
					mergeTag.removeAttribute('contenteditable');
				}
			}
		});

		var _editableTimeout;
		editor.on('ExecCommand', function(event) {
			if (_editableTimeout) {
				clearTimeout(_editableTimeout);
			}

			_editableTimeout = setTimeout(function() {
				var mergeTagElements = editor.getBody().querySelectorAll('span.merge-tag');
				for (var mergeTag of mergeTagElements) {
					for (var styleProp in mergeTagStyle) {
						mergeTag.style.setProperty(styleProp, mergeTagStyle[styleProp]);
					}

					setTimeout(function() {
						mergeTag.setAttribute('contenteditable', false);
					}, 10);
				}
			}, 20);
		});

		editor.on('PreInit', function() {
			var target;

			var dialogConfig = {
				title: 'Merge Tag Options',
				
				body: {
					type: 'panel',
					items: [
						{
							type: 'input',
							label: 'Enter text to display when there is no merge tag value',
							name: 'fallback_text'
						}
					]
				},

				buttons: [
					{
						type: 'submit',
						text: 'Update'
					}
				],

				onSubmit: function(instance) {
					var data = instance.getData();
					target.dataset.fallback = data.fallback_text;
					instance.close();
				},

				onClose: function() {
					target = undefined;
					editor.selection.collapse();
				}
			};

			editor.on('click', function(event) {
				if (event.target && event.target.matches('span.merge-tag')) {
					target = event.target;
					dialogConfig.initialData = {
						fallback_text: target.dataset.fallback || ''
					};
					editor.windowManager.open(dialogConfig);
				}
			});

			editor.on('BeforeSetContent', function(event) {
				if (event.format === 'raw') {
					return;
				}

				var content = event.content,
					mergeTagRegex = new RegExp('\\*\\|([a-zA-Z_]+)(\\?[^\\|]+)?\\|\\*', 'g'),
					contentOffset = 0;

				for (var match of content.matchAll(mergeTagRegex)) {
					var mergeTag = match[1];

					var tag = makeMergeTag(mergeTag);

					if (match[2] && match[2].length > 1) {
						tag.dataset.fallback = match[2].substring(1);
					}

					var asHtml = tag.outerHTML,
						prefix = content.substring(0, match.index + contentOffset),
						suffix = content.substring(match.index + contentOffset + match[0].length);

					content = prefix + asHtml + suffix;
					contentOffset += asHtml.length - match[0].length;
				}

				event.content = content;
			});

			editor.serializer.addNodeFilter('span', function(nodes) {
				var i = nodes.length, node;

				while (i--) {
					node = nodes[i];

					var tagType = node.attr('data-tagtype');
					if (!tagType) {
						continue;
					}

					var mergeTag = "*|" + tagType;

					var fallback = node.attr('data-fallback');
					if (fallback) {
						mergeTag += "?" + fallback;
					}
					
					mergeTag += "|*";

					node.name = '#text';
					node.type = 3;
					node.raw = true;
					node.value = mergeTag;
				}
			});

			editor.formatter.get('forecolor')[0].exact = true;
			editor.formatter.get('hilitecolor')[0].exact = true;
		});

		var scanMergeTags = function(event) {
			var mergeTagRegex = new RegExp('\\*\\|([a-zA-Z_]+)(\\?[^\\|]+)?\\|\\*');

			var startNode = (event.inputType === 'insertFromPaste')
				? editor.getBody() : editor.selection.getRng().commonAncestorContainer;

			var walker = new tinymce.dom.TreeWalker(startNode);

			do {
				var currentNode = walker.current(),
					match;

				if (currentNode.nodeType === 3) {
					if (currentNode.length < 5) {
						continue;
					} 

					var range = new Range();
					range.setStart(currentNode, 0);
					range.setEnd(currentNode, currentNode.length);

					while ((match = range.toString().match(mergeTagRegex))) {
						if (!mergeTags.hasOwnProperty(match[1])) {
							range.setStart(range.startContainer, match.index + match[0].length);
							continue;
						}

						range.setStart(range.startContainer, match.index);
						range.setEnd(range.endContainer, match.index + match[0].length);
						range.deleteContents();

						var tag = makeMergeTag(match[1]);

						if (match[2] && match[2].length > 1) {
							tag.dataset.fallback = match[2].substring(1);
						}

						range.insertNode(tag);
						range.setEnd(range.commonAncestorContainer, range.commonAncestorContainer.length);
						range.setStartAfter(tag);

						if (event.inputType !== 'insertFromPaste') {
							editor.selection.setCursorLocation(range.commonAncestorContainer, range.endOffset);
						}
					}
				}
			} while (walker.next());
		}

		var scanMergeTagsTimeout = 0;
		editor.on('input', function(event) {
			if (editor.selection.isCollapsed()) {
				if (scanMergeTagsTimeout) {
					clearTimeout(scanMergeTagsTimeout);
				}

				setTimeout(scanMergeTags.bind(this, event), 10);
			}
		});

		return {
			getMetadata: function() {
				return {
					name: 'Visual Merge Tags'
				};
			}
		}
	});
})();