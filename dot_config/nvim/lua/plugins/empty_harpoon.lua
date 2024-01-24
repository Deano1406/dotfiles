return {
	"ThePrimeagen/harpoon",
	branch = "harpoon2",
	dependencies = { "nvim-lua/plenary.nvim" },
	config = function()
		-- [[ HARPOON2 CONFIGURATION ]]
		-- Basic Harpoon2 config
		local harpoon = require("harpoon")

		vim.keymap.set("n", "<leader>Ha", function()
			harpoon:list():append()
		end)

		vim.keymap.set("n", "<leader>H1", function()
			harpoon:list():select(1)
		end)
		vim.keymap.set("n", "<leader>H2", function()
			harpoon:list():select(2)
		end)
		vim.keymap.set("n", "<leader>H3", function()
			harpoon:list():select(3)
		end)
		vim.keymap.set("n", "<leader>H4", function()
			harpoon:list():select(4)
		end)

		-- Toggle previous & next buffers stored within Harpoon list
		vim.keymap.set("n", "<leder>Hp", function()
			harpoon:list():prev()
		end)
		vim.keymap.set("n", "<leader>Hn", function()
			harpoon:list():next()
		end)
		-- Harpoon 2 Using Telescope UI
		vim.keymap.set("n", "<C-e>", function()
			harpoon.ui:toggle_quick_menu(harpoon:list())
		end)
		harpoon:setup({})

		-- basic telescope configuration
		local conf = require("telescope.config").values
		local function toggle_telescope(harpoon_files)
			local file_paths = {}
			for _, item in ipairs(harpoon_files.items) do
				table.insert(file_paths, item.value)
			end

			require("telescope.pickers")
				.new({}, {
					prompt_title = "Harpoon",
					finder = require("telescope.finders").new_table({
						results = file_paths,
					}),
					previewer = conf.file_previewer({}),
					sorter = conf.generic_sorter({}),
				})
				:find()
		end

		vim.keymap.set("n", "<leader>Hw", function()
			toggle_telescope(harpoon:list())
		end, { desc = "Open harpoon window" })

		require("which-key").register({
			["<leader>H"] = {
				name = "Harpoon",
				a = "[a]ppend to Harpoon",
				w = "Open Harpoon [w]indow",
				p = "Harpoon [p]revious",
				n = "Harpoon [n]ext",
			},
		})
	end,
}
