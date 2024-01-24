return {
	"williamboman/mason.nvim",
	--config = true,
	dependencies = {
		"williamboman/mason-lspconfig.nvim",
		"WhoIsSethDaniel/mason-tool-installer.nvim",
	},
	registries = {
		"github:mason-org/mason-registry",
	},

	---@since 1.0.0
	-- The provider implementations to use for resolving supplementary package metadata (e.g., all available versions).
	-- Accepts multiple entries, where later entries will be used as fallback should prior providers fail.
	-- Builtin providers are:
	--   - mason.providers.registry-api  - uses the https://api.mason-registry.dev API
	--   - mason.providers.client        - uses only client-side tooling to resolve metadata
	providers = {
		"mason.providers.registry-api",
		"mason.providers.client",
	},

	github = {
		---@since 1.0.0
		-- The template URL to use when downloading assets from GitHub.
		-- The placeholders are the following (in order):
		-- 1. The repository (e.g. "rust-lang/rust-analyzer")
		-- 2. The release version (e.g. "v0.3.0")
		-- 3. The asset name (e.g. "rust-analyzer-v0.3.0-x86_64-unknown-linux-gnu.tar.gz")
		download_url_template = "https://github.com/%s/releases/download/%s/%s",
	},

	pip = {
		---@since 1.0.0
		-- Whether to upgrade pip to the latest version in the virtual environment before installing packages.
		upgrade_pip = false,

		---@since 1.0.0
		-- These args will be added to `pip install` calls. Note that setting extra args might impact intended behavior
		-- and is not recommended.
		--
		-- Example: { "--proxy", "https://proxyserver" }
		install_args = {},
	},

	ui = {
		---@since 1.0.0
		-- Whether to automatically check for new versions when opening the :Mason window.
		check_outdated_packages_on_open = true,

		---@since 1.0.0
		-- The border to use for the UI window. Accepts same border values as |nvim_open_win()|.
		border = "none",

		---@since 1.0.0
		-- Width of the window. Accepts:
		-- - Integer greater than 1 for fixed width.
		-- - Float in the range of 0-1 for a percentage of screen width.
		width = 0.8,

		---@since 1.0.0
		-- Height of the window. Accepts:
		-- - Integer greater than 1 for fixed height.
		-- - Float in the range of 0-1 for a percentage of screen height.
		height = 0.9,

		icons = {
			package_installed = "✓",
			package_pending = "➜",
			package_uninstalled = "✗",
		},
		keymaps = {
			---@since 1.0.0
			-- Keymap to expand a package
			toggle_package_expand = "<CR>",
			---@since 1.0.0
			-- Keymap to install the package under the current cursor position
			install_package = "i",
			---@since 1.0.0
			-- Keymap to reinstall/update the package under the current cursor position
			update_package = "u",
			---@since 1.0.0
			-- Keymap to check for new version for the package under the current cursor position
			check_package_version = "c",
			---@since 1.0.0
			-- Keymap to update all installed packages
			update_all_packages = "U",
			---@since 1.0.0
			-- Keymap to check which installed packages are outdated
			check_outdated_packages = "C",
			---@since 1.0.0
			-- Keymap to uninstall a package
			uninstall_package = "X",
			---@since 1.0.0
			-- Keymap to cancel a package installation
			cancel_installation = "<C-c>",
			---@since 1.0.0
			-- Keymap to apply language filter
			apply_language_filter = "<C-f>",
			---@since 1.1.0
			-- Keymap to toggle viewing package installation log
			toggle_package_install_log = "<CR>",
			---@since 1.8.0
			-- Keymap to toggle the help view
			toggle_help = "g?",
		},
	},
	config = function()
		-- [[ MASON CONFIGURATION ]]
		--
		require("mason").setup()
		require("mason-lspconfig").setup()

		-- Enable the following language servers
		--  Feel free to add/remove any LSPs that you want here. They will automatically be installed.
		--
		--  Add any additional override configuration in the following tables. They will be passed to
		--  the `settings` field of the server config. You must look up that documentation yourself.
		--
		--  If you want to override the default filetypes that your language server will attach to you can
		--  define the property 'filetypes' to the map in question.
		local servers = {
			clangd = {},
			gopls = {},
			pyright = {},
			rust_analyzer = {},
			tsserver = {},
			html = { filetypes = { "html", "twig", "hbs" } },
			lua_ls = {
				Lua = {
					workspace = { checkThirdParty = false },
					telemetry = { enable = false },
					-- NOTE: toggle below to ignore Lua_LS's noisy `missing-fields` warnings
					-- diagnostics = { disable = { 'missing-fields' } },
				},
			},
		}

		-- mason-lspconfig requires that these setup functions are called in this order
		-- before setting up the servers.

		-- Setup neovim lua configuration
		require("neodev").setup()

		-- nvim-cmp supports additional completion capabilities, so broadcast that to servers
		local capabilities = vim.lsp.protocol.make_client_capabilities()
		capabilities = require("cmp_nvim_lsp").default_capabilities(capabilities)

		-- Ensure the servers above are installed
		local mason_lspconfig = require("mason-lspconfig")
		local mason_tool_installer = require("mason-tool-installer")

		mason_lspconfig.setup({
			ensure_installed = vim.tbl_keys(servers),
			ui = {
				icons = {
					package_installed = "✓",
					package_pending = "▷",
					package_uninstalled = "✕",
				},
			},
			ensure_installed = {
				"tsserver",
				"html",
				"lua_ls",
				"pyright",
				"yamlls",
			},
			automatic_installation = true,
		})
		mason_tool_installer.setup({
			ensure_installed = {
				"prettier",
				"stylua",
				"isort",
				"black",
				"pylint",
				"yamlfmt",
				"yamllint",
			},
		})

		mason_lspconfig.setup_handlers({
			function(server_name)
				require("lspconfig")[server_name].setup({
					capabilities = capabilities,
					on_attach = on_attach,
					settings = servers[server_name],
					filetypes = (servers[server_name] or {}).filetypes,
				})
			end,
		})
	end,
}
--ui = {
--	icons = {
--		package_installed = "✓",
--		package_pending = "➜",
--		package_uninstalled = "✗",
--	},
--},
--local servers = {
--clangd = {},
--gopls = {},
--pyright = {},
--rust_analyzer = {},
--tsserver = {},
--html = { filetypes = { "html", "twig", "hbs" } },
--lua_ls = {
--	Lua = {
--		workspace = { checkThirdParty = false },
--		telemetry = { enable = false },
--		-- NOTE: toggle below to ignore Lua_LS's noisy `missing-fields` warnings
--		-- diagnostics = { disable = { 'missing-fields' } },
--	}
--}

--}
