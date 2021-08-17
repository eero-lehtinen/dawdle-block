import {
	Drawer,
	Toolbar,
	Divider,
	List,
	ListItemButton,
	ListItemText,
	ListItemIcon,
	ListSubheader,
	Button,
	Box,
} from "@material-ui/core"
import {
	SettingsRounded,
	AddRounded,
	ImportExportRounded,
	LockRounded,
} from "@material-ui/icons"
import { useBGScript } from "@src/shared/BGScriptProvider"
import { useState, useRef } from "preact/hooks"
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
		<li>
			<Box sx={{ px: 1, py: 1 / 2 }}>
				<ListItemButton
					selected={currentPath === to}
					sx={{
						height: 40,
						px: 1,
						borderRadius: 1,
						// Use "before" to preserve larger click area
						":before": {
							content: "''",
							position: "absolute",
							left: "-8px",
							width: `calc(100% + 16px)`,
							top: "-4px",
							height: `calc(100% + 8px)`,
						},
					}}
					component={RouterLink}
					to={to}
				>
					{icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
					<ListItemText primary={primary} />
				</ListItemButton>
			</Box>
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

	const addNewBlockSet = async () => {
		if (addPending.current) return
		addPending.current = true
		const res = await bg.blockSets.addDefaultBlockSet()
		if (res.isOk()) setBlockSetsList([...bg.blockSets.list])
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
			<List>
				<Divider sx={{ my: 1 }} />
				<ListItemLink
					to="/general-options"
					primary={"General Options"}
					icon={<SettingsRounded />}
					currentPath={currentPath}
				/>
				<ListItemLink
					to="/settings-lock"
					primary={"Settings Lock"}
					icon={<LockRounded />}
					currentPath={currentPath}
				/>
				<ListItemLink
					to="/import-export"
					primary={"Import/Export"}
					icon={<ImportExportRounded />}
					currentPath={currentPath}
				/>

				<Divider sx={{ my: 1 }} />
				<ListSubheader>BLOCK SETS</ListSubheader>

				{blockSetsList.map((blockSet, index) => (
					<ListItemLink
						to={`/block-sets/${index + 1}`}
						key={blockSet.id}
						primary={blockSet.data.name}
						currentPath={currentPath}
					/>
				))}

				<Button
					size="large"
					sx={{ float: "right", mr: 1 }}
					startIcon={<AddRounded />}
					onClick={addNewBlockSet}
				>
					Add New Block Set
				</Button>
			</List>
		</Drawer>
	)
}

export default NavDrawer
