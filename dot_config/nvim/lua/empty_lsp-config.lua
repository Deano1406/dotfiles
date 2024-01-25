local mason = require("mason")
local mason_lspconfig = require("mason-lspconfig")
local lspconfig = require("lspconfig")

mason.setup()
mason_lspconfig.setup({
	ensure_installed = {
		"tsserver",
		"html",
		"pyright",
		"lua_ls",
	},
	automatic_installation = true,
})

lspconfig.lua_ls.setup({})
lspconfig.pyright.setup({})
lspconfig.html.setup({})
lspconfig.tsserver.setup({})
