local mason = require("mason")
local mason_lspconfig = require("mason-lspconfig")
local lspconfig = require("lspconfig")
local mason_tool_installer = require("mason-tool-installer")
local conform = require("conform")
local lint = require("lint")

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
		"luacheck",
		"pylint",
		"zsh",
	},
	auto_update = true,
	debounce_hours = 3,
})

 lint.event = { "BufReadPre", "BufNewFile" }
 lint.config = function()
	local lint = require("lint");

	lint.linters_by_ft = {
		lua = { "luacheck" },
		python = { "pylint" },
		zsh = { "zsh" },
	}
	local lint_augroup = vim.api.nvim_create_augroup("lint", { clear = true })

	vim.api.nvim_create_autocmd({ "BufEnter", "BufWritePost", "InsertLeave" }, {
		group = lint_augroup,
		callback = function()
			lint.try_lint()
		end,
	})

	vim.keymap.set("n", "<leader>ml", function()
		lint.try_lint()
	end, { desc = "Trigger linting for the current file" })
end

conform.event = { "BufReadPre", "BufNewFile" }
conform.config = function()
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
	}
	format_on_save = {
		lsp_fallback = true,
		async = false,
		timeout_ms = 2000,
	}
	vim.keymap.set({ "n", "v" }, "<leader>mp", function()
		conform.format({
			lsp_fallback = true,
			async = false,
			timeout_ms = 2000
		})	
	end, { desc = "Format file or range (in visual mode)" })
end
