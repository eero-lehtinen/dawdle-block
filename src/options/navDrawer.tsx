import { 
	Drawer, Toolbar, Divider, List, ListItemButton, 
	ListItemText, ListItemIcon, ListSubheader, Button, 
} from "@material-ui/core"
import { SettingsRounded, AddRounded, ImportExportRounded } from "@material-ui/icons"
import { useBGScript } from "@src/shared/bgScriptProvider"
import { useMemo } from "preact/hooks"
import { forwardRef } from "preact/compat"
import { Link as RouterLink, LinkProps as RouterLinkProps, useLocation } from "react-router-dom"

const drawerWidth = 300

interface ListItemLinkProps {
  icon?: JSX.Element
  primary: string
  to: string
	currentPath: string
}

/** 
 * Element mostly copied from https://next.material-ui.com/guides/routing/#list.
 * Inner workings are hazy.
 */
const ListItemLink = ({ icon, primary, to, currentPath }: ListItemLinkProps) => {
	const renderLink = useMemo(
		() =>
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			forwardRef<any, Omit<RouterLinkProps, "to">>((itemProps, ref) => (
				<RouterLink to={to} ref={ref} {...itemProps} />
			)),
		[to],
	)

	return (
		<ListItemButton 
			disableRipple
			selected={currentPath === to} 
			component={renderLink} 
			sx={{ borderRadius: 1.5, mb: 0.5 }}
		>
			{icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
			<ListItemText primary={primary} />
		</ListItemButton>
	)
}

/**
 * Navigation drawer for options menu.
 */
export const NavDrawer = (): JSX.Element => {
	const bg = useBGScript()
	const location = useLocation()
	const path = location.pathname

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
					currentPath={path}
				/>

				<ListItemLink 
					to="/import-export" 
					primary={"Import/Export"}
					icon={<ImportExportRounded />}
					currentPath={path}
				/>

				<ListSubheader>BLOCK SETS</ListSubheader>

				{
					bg.blockSets.list.map((blockSet, index) => (
						<ListItemLink 
							to={`/block-sets/${index + 1}`} 
							key={blockSet.id} 
							primary={blockSet.name}
							currentPath={path}
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