return {
	"nvimtools/none-ls.nvim",
	config = function()
		local null_ls = require("null-ls")
		null_ls.setup({
			null_ls.builtins.formatting.stylua,
			null_ls.builtins.formatting.black,
			null_ls.builtins.formatting.isort,
			null_ls.builtins.diagnostics.ruff,
			null_ls.builtins.diagnostics.selene,
			null_ls.builtins.diagnostics.pylint,
			--null_ls.builtins.diganostics.lua_ls,
		})
	end,
}
