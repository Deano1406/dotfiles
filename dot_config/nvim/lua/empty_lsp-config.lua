local mason = require("mason")
local mason_lspconfig = require("mason-lspconfig")
local lspconfig = require("lspconfig")
local conform = require("conform")
local mason_tool_installer = require("mason-tool-installer")

mason.setup()
mason_lspconfig.setup({
	ensure_installed = {
		"tsserver",
		"html",
		"pyright",
		"lua_ls",
		"yamlls",
	},
	automatic_installation = true,
})

lspconfig.lua_ls.setup({})
lspconfig.pyright.setup({})
lspconfig.html.setup({})
lspconfig.tsserver.setup({})
lspconfig.yamlls.setup({})

mason_tool_installer.setup({
	ensure_installed = {
		"prettier",
		"stylua",
		"isort",
		"black",
	},
	auto_update = true,
	debounce_hours = 3,
})

conform.event = { "BufReadPre", "BufNewFile" }
conform.setup({
	formatters_by_ft = {
		javascript = { "prettier" },
		typescript = { "prettier" },
		javascriptreact = { "prettier" },
		typescriptreact = { "prettier" },
		svelte = { "prettier" },
		css = { "prettier" },
		html = { "prettier" },
		json = { "prettier" },
		yaml = { "prettier" },
		markdown = { "prettier" },
		graphql = { "prettier" },
		lua = { "stylua" },
		python = { "isort", "black" },
	},
	vim.keymap.set({ "n", "v" }, "<leader>mp", function()
		conform.format({
			lsp_fallback = true,
			async = false,
			timeout_ms = 5000,
		})
	end, { desc = "Format file or range (in visual mode)" }),
})
