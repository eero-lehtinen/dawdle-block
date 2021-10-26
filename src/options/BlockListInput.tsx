import {
	DragDropContext,
	Droppable,
	Draggable,
	DropResult,
	DraggableProvided,
	DraggableStateSnapshot,
} from "react-beautiful-dnd"
import { useState } from "preact/hooks"
import {
	List,
	ListItem,
	ListItemText,
	Button,
	Collapse,
	ListItemButton,
	Box,
	Typography,
} from "@mui/material"
import { BlockSet, ListType } from "@src/background/blockSet"
import { ExpandLessRounded, ExpandMoreRounded } from "@mui/icons-material"
import { BlockList } from "@src/background/blockSetParseTypes"
import useEffectCleanUpPageUnload from "@src/shared/useEffectCleanupPageUnload"
import { ytCategoryNamesById } from "@src/background/constants"

interface DragListItemProps {
	contentElem: JSX.Element
	provided: DraggableProvided
	snapshot: DraggableStateSnapshot
}

/** Draggable block rule list item */
const BlockRuleItem = (props: DragListItemProps) => {
	const { contentElem, provided, snapshot } = props
	return (
		<ListItem
			secondaryAction={<Button size="small">Button</Button>}
			ref={provided.innerRef}
			{...provided.draggableProps}
			{...provided.dragHandleProps}
			sx={{
				pl: 4,
				backgroundColor: "background.default",
				boxShadow: snapshot.isDragging ? 3 : 0,
				transition: "box-shadow 0.5s",
			}}
		>
			<ListItemText primary={contentElem} secondary={null} />
		</ListItem>
	)
}

const listDisplayNames: [keyof BlockList, string][] = [
	["urlPatterns", "URL Patterns"],
	["urlRegExps", "URL Regular Expressions"],
	["ytChannels", "YouTube Channels"],
	["ytCategoryIds", "YouTube Categories"],
]

interface BlockListCollapseItemProps {
	blockSet: BlockSet
	listType: ListType
	listKey: keyof BlockList
	listName: string
	onChanged: () => void
}

/**
 * List of block rules fetched from blockSet by listType and listKey.
 * Is collapsible and allows dragging elements around.
 */
const BlockListDraggable = (props: BlockListCollapseItemProps): JSX.Element => {
	const { blockSet, listType, listName, listKey, onChanged } = props

	type List = typeof blockSet.data[typeof listType][typeof listKey]

	const [list, setList] = useState({ val: blockSet.getBlockList(listType)[listKey] })

	useEffectCleanUpPageUnload(
		() =>
			blockSet.subscribeBlockListChanged(
				listType,
				listKey,
				({ newValue }: { newValue: List }) => setList({ val: newValue })
			),
		[blockSet, listType, listKey]
	)

	const onDragEnd = (result: DropResult) => {
		const newList = [...list.val]
		const [removed] = newList.splice(result.source.index, 1)
		if (result.destination === undefined || removed === undefined) return
		newList.splice(result.destination.index, 0, removed)

		// TODO: use blockSet functions
		setList({ val: newList as List })
		onChanged()
	}

	const [open, setOpen] = useState(true)

	const handleClick = () => {
		setOpen(!open)
	}

	const toElem = (value: List[number]) => {
		if (listKey === "urlPatterns") {
			return <span>{value}</span>
		} else if (listKey === "urlRegExps") {
			return <span>{value}</span>
		} else if (listKey === "ytChannels") {
			value = value as { id: string; title: string }
			return (
				<span>
					{value.id} {value.title}
				</span>
			)
		} else if (listKey === "ytCategoryIds") {
			return (
				<span>
					{value} {ytCategoryNamesById[value as string]}
				</span>
			)
		}
		return <span />
	}

	return (
		<List dense={true} disablePadding>
			<ListItemButton onClick={handleClick}>
				<ListItemText primary={listName} />
				{open ? <ExpandLessRounded /> : <ExpandMoreRounded />}
			</ListItemButton>
			<Collapse in={open} unmountOnExit>
				<DragDropContext onDragEnd={onDragEnd}>
					<Droppable droppableId={`${listName}-droppable`}>
						{(provided): JSX.Element => (
							<List
								disablePadding
								dense={true}
								{...provided.droppableProps}
								ref={provided.innerRef}
							>
								{list.val.map((item, index): JSX.Element => {
									const key = typeof item === "string" ? item : item.id
									return (
										<Draggable key={key} draggableId={key} index={index}>
											{(provided, snapshot): JSX.Element => (
												<BlockRuleItem
													provided={provided}
													snapshot={snapshot}
													contentElem={toElem(item)}
												/>
											)}
										</Draggable>
									)
								})}
								{provided.placeholder}
							</List>
						)}
					</Droppable>
				</DragDropContext>
			</Collapse>
		</List>
	)
}

interface BlockListInputProps {
	blockSet: BlockSet
	listType: ListType
	onChanged: () => void
}

/**
 * Shows a categorized list of all block rules.
 * Allows adding, editing, deleting and reordering block rules.
 */
const BlockListInput = (props: BlockListInputProps): JSX.Element => {
	const { blockSet, listType } = props

	// TODO: INPUT

	return (
		<Box>
			<Typography variant="h2" sx={{ mb: 1, textTransform: "capitalize" }}>
				{listType}
			</Typography>
			{listDisplayNames.map(([key, name]) => (
				<BlockListDraggable
					key={key}
					blockSet={blockSet}
					listType={listType}
					listKey={key}
					listName={name}
					onChanged={() => {
						/* do nothing */
					}}
				/>
			))}
		</Box>
	)
}

export default BlockListInput
