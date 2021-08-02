import { 
	Drawer, Toolbar, Divider, List, ListItemButton, 
	ListItemText, ListItemIcon, ListSubheader, Button, 
} from "@material-ui/core"
import { SettingsRounded, AddRounded, ImportExportRounded } from "@material-ui/icons"
import { useBGScript } from "@src/shared/BGScriptProvider"
import { useState, useRef } from "preact/hooks"
import { Link as RouterLink, useLocation } from "react-router-dom"

const drawerWidth = 300

const betweenButtonMargin = 0.5

interface ListItemLinkProps {
  icon?: JSX.Element
  primary: string
  to: string
	currentPath: string
}

/** Link for navigation drawer */
const ListItemLink = ({ icon, primary, to, currentPath }: ListItemLinkProps) => {
	return (
		<li>
			<ListItemButton 
				disableRipple
				selected={currentPath === to}
				sx={{ borderRadius: 1.5, mb: betweenButtonMargin }}
				component={RouterLink}
				to={to}
			>
				{icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
				<ListItemText primary={primary} />
			</ListItemButton>
		</li>
	)
}

/**
 * Navigation drawer for options menu.
 */
const NavDrawer = (): JSX.Element => {
	const bg = useBGScript()
	const location = useLocation()
	const currentPath = location.pathname

	const [blockSetsList, setBlockSetsList] = useState(bg.blockSets.list)
	const addPending = useRef(false)

	const addNewBlockSet = async() => {
		if (addPending.current) return
		addPending.current = true
		const res = await bg.blockSets.addDefaultBlockSet()
		if (res.isOk())
			setBlockSetsList([...bg.blockSets.list])
		addPending.current = false
	}

	return (
		<Drawer
			variant="permanent" 
			anchor="left"
			sx={{
				width: drawerWidth,
				bgcolor: "background.default",
				flexShrink: 0,
				"& > .MuiDrawer-paper": {
					width: drawerWidth,
					boxSizing: "border-box",
					left: "initial",
				},
			}}
		>
			<Toolbar />
			<List sx={{ pr: 1, pl: 1 }}>
				<Divider sx={{ mb: betweenButtonMargin }} />
				<ListItemLink 
					to="/general-options" 
					primary={"General Options"}
					icon={<SettingsRounded />}
					currentPath={currentPath}
				/>
				<ListItemLink 
					to="/import-export" 
					primary={"Import/Export"}
					icon={<ImportExportRounded />}
					currentPath={currentPath}
				/>

				<Divider sx={{ mb: betweenButtonMargin }} />
				<ListSubheader>BLOCK SETS</ListSubheader>

				{
					blockSetsList.map((blockSet, index) => (
						<ListItemLink 
							to={`/block-sets/${index + 1}`} 
							key={blockSet.id}
							primary={blockSet.name}
							currentPath={currentPath}
						/>
					))
				}

				<Button size="large" sx={{ float: "right" }} startIcon={<AddRounded />}
					onClick={addNewBlockSet}
				>
						Add New Block Set
				</Button>

			</List>
		</Drawer>
	)
}

export default NavDrawer