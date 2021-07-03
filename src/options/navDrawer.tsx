import { Drawer, Toolbar, Divider, List, ListItem, ListItemText, ListItemIcon } 
	from "@material-ui/core"
import { SettingsRounded } from "@material-ui/icons"

const drawerWidth = 300

/**
 * Navigation drawer for options menu.
 */
export const NavDrawer = (): JSX.Element => {
	return (
		<Drawer
			variant="permanent" 
			anchor="left"
			sx={{
				width: drawerWidth,
				bgcolor: "background.default",
				flexShrink: 0,
				"& .MuiDrawer-paper": {
					width: drawerWidth,
					boxSizing: "border-box",
				},
			}}
		>
			<Toolbar />
			<Divider />
			<List sx={{ p: 1 }}>

				<ListItem button sx={{ borderRadius: 1.5 }}>
					<ListItemIcon>
						<SettingsRounded />
					</ListItemIcon>
					<ListItemText primary="Settings" />
				</ListItem>

				<ListItem button sx={{ borderRadius: 1.5 }}>
					<ListItemIcon>
						<SettingsRounded />
					</ListItemIcon>
					<ListItemText primary="Block Sets" />
				</ListItem>

			</List>
		</Drawer>
	)
}