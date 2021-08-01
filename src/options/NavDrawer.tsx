import { 
	Drawer, Toolbar, Divider, List, ListItemButton, 
	ListItemText, ListItemIcon, ListSubheader, Button, 
} from "@material-ui/core"
import { SettingsRounded, AddRounded, ImportExportRounded } from "@material-ui/icons"
import { useBGScript } from "@src/shared/BGScriptProvider"
import { Link as RouterLink, useLocation } from "react-router-dom"

const drawerWidth = 300

interface ListItemLinkProps {
  icon?: JSX.Element
  primary: string
  to: string
	currentPath: string
}

/** Link for navigation drawer */
const ListItemLink = ({ icon, primary, to, currentPath }: ListItemLinkProps) => {
	return (
		<ListItemButton 
			disableRipple
			selected={currentPath === to}
			sx={{ borderRadius: 1.5, mb: 0.5 }}
			component={RouterLink}
			to={to}
		>
			{icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
			<ListItemText primary={primary} />
		</ListItemButton>
	)
}

/**
 * Navigation drawer for options menu.
 */
const NavDrawer = (): JSX.Element => {
	const bg = useBGScript()
	const location = useLocation()
	const currentPath = location.pathname

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
			<Divider sx={{ mr: 3, ml: 3 }} />
			<List sx={{ pr: 1, pl: 1 }}>

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

				<ListSubheader>BLOCK SETS</ListSubheader>

				{
					bg.blockSets.list.map((blockSet, index) => (
						<ListItemLink 
							to={`/block-sets/${index + 1}`} 
							key={blockSet.id} 
							primary={blockSet.name}
							currentPath={currentPath}
						/>
					))
				}

				<Button size="large" sx={{ float: "right" }} startIcon={<AddRounded />}>
						Add New Block Set
				</Button>

			</List>
		</Drawer>
	)
}

export default NavDrawer