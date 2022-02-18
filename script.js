const mergeTags = [
	{
		name: 'My Merge Tags',

		items: [
			{
				text: 'First Name',
				value: '*|FIRST_NAME|*'
			},
			{
				text: 'Last Name',
				value: '*|LAST_NAME|*'
			},
			{
				text: 'Email Address',
				value: '*|EMAIL_ADDRESS|*'
			}
		]
	}
];

tinymce.init({
	selector: 'textarea',
	menubar: false,
	inline_boundaries: false,
	resize: false,
	toolbar: "styleselect fontselect fontsizeselect | bold italic underline strikethrough | link unlink mergefields | code",

	plugins: 'link,code',

	external_plugins: {
	  visualMergeTags: '../plugin/visual-merge-tags.js'
	},

	merge_tags: {
		FIRST_NAME: "First Name",
		LAST_NAME: "Last Name",
		EMAIL_ADDRESS: "Email Address"
	},

	merge_tag_style: {
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
	},

	setup: function(editor) {
		editor.ui.registry.addMenuButton("mergefields", {
			text: "Personalisation",

			fetch: function(callback) {
				let getSubMenuItemsRec = function(item) {
					if (item.items) {
						return {
							type: "nestedmenuitem",
							text: item.name,

							getSubmenuItems: function() {
								return item.items.map(function(subItem) {
									return getSubMenuItemsRec(subItem);
								});
							}
						};
					} else {
						return {
							type: "menuitem",
							text: item.text,

							onAction: function() {
								editor.insertContent(item.value);
							},
						};
					}
				};

				callback(mergeTags.map(function(item) {
					return getSubMenuItemsRec(item);
				}));
			},
		});
	},

	paste_preprocess: function(plugin, args) {
		if (args.content.toString().includes("<img")) {
			args.content = "";
		}
	},
});