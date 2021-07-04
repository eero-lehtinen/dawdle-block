import { Drawer, Toolbar, Divider, List, ListItem, ListItemText, ListItemIcon, ListSubheader } 
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
					left: "initial",
				},
			}}
		>
			<Toolbar />
			<Divider sx={{ mr: 3, ml: 3 }} />
			<List sx={{ pr: 1, pl: 1 }}>

				<ListSubheader>GENERAL</ListSubheader>

				<ListItem button sx={{ borderRadius: 1.5, mb: 0.5 }}>
					<ListItemIcon>
						<SettingsRounded />
					</ListItemIcon>
					<ListItemText primary="Settings" />
				</ListItem>

				{
					[...Array(30)].map((v, i) => (
						<ListItem key={i} button sx={{ borderRadius: 1.5, mb: 0.5 }}>
							<ListItemIcon>
								<SettingsRounded />
							</ListItemIcon>
							<ListItemText primary="Block Sets" />
						</ListItem>
					))
				}
			</List>
		</Drawer>
	)
}