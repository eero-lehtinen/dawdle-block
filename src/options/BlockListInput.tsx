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
	ListItemButton,
	Collapse,
	Box,
	Typography,
	TextField,
	IconButton,
	NativeSelect,
	Stack,
} from "@mui/material"
import { BlockSet, ListType } from "@src/background/blockSet"
import {
	ExpandLessRounded,
	ExpandMoreRounded,
	AddRounded,
	DeleteRounded,
} from "@mui/icons-material"
import { BlockList } from "@src/background/blockSetParseTypes"
import useEffectCleanUpPageUnload from "@src/shared/useEffectCleanupPageUnload"
import { ytCategoryNamesById } from "@src/background/constants"

interface DragListItemProps {
	contentElem: JSX.Element
	provided: DraggableProvided
	snapshot: DraggableStateSnapshot
	removeMe: () => void
}

/** Draggable block rule list item */
const BlockRuleItem = (props: DragListItemProps) => {
	const { contentElem, provided, snapshot, removeMe } = props

	return (
		<ListItem
			secondaryAction={
				<IconButton size="small" aria-label="remove rule">
					<DeleteRounded fontSize="small" onClick={() => removeMe()} />
				</IconButton>
			}
			ref={provided.innerRef}
			{...provided.draggableProps}
			{...provided.dragHandleProps}
			sx={{
				pl: 4,
				backgroundColor: "background.default",
				boxShadow: snapshot.isDragging ? 3 : 0,
				transition: "box-shadow 0.5s",
				"& .MuiListItemSecondaryAction-root": {
					opacity: 0,
				},
				"&:hover, &:focus, &:active": {
					"& .MuiListItemSecondaryAction-root": {
						opacity: 1,
					},
				},
			}}
		>
			<ListItemText
				sx={{
					"& span": {
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
					},
				}}
				primary={contentElem}
				secondary={null}
			/>
		</ListItem>
	)
}

const listDisplayNames: [keyof BlockList, string][] = [
	["urlPatterns", "URL Patterns"],
	["ytChannels", "YouTube Channels"],
	["ytCategoryIds", "YouTube Categories"],
	["urlRegExps", "URL Regular Expressions"],
]

const placeholders = {
	urlPatterns: "e.g. www.youtube.com*",
	ytChannels: "e.g. UC2C_jShtL725hvbm1arSV9w",
	ytCategoryIds: "e.g. 10",
	urlRegExps: String.raw`e.g. www\.google\.com\/search\?q=(potato|carrot)+`,
}

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

	const [list, setList] = useState({ val: blockSet.data[listType][listKey] })

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
		blockSet.moveBlockListRule(
			listType,
			listKey,
			result.source.index,
			result.destination?.index ?? -1
		)
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

	const removeRule = (value: string) => {
		let success = false
		if (listKey === "urlPatterns") {
			success = blockSet.removePattern(listType, value)
		} else if (listKey === "urlRegExps") {
			success = blockSet.removeRegExp(listType, value)
		} else if (listKey === "ytChannels") {
			success = blockSet.removeYTChannel(listType, value)
		} else if (listKey === "ytCategoryIds") {
			success = blockSet.removeYTCategory(listType, value)
		}

		if (!success) {
			// TODO: show error message
			console.error(`could not delete rule ${listType}, ${listKey}, ${value}`)
		}
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
													removeMe={() => removeRule(key)}
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

interface RuleInputProps {
	listType: ListType
	blockSet: BlockSet
}

/** Used for adding new rules.
 * Allows selection of the type of the rule and the rule itself in a text box */
const RuleInput = (props: RuleInputProps) => {
	const { listType, blockSet } = props

	const [ruleType, setRuleType] = useState("urlPatterns")

	const [ruleText, setRuleText] = useState("")

	const addCurrentRule = async () => {
		if (ruleText === "") {
			return
		}

		let res
		if (ruleType === "urlPatterns") {
			res = blockSet.addPattern(listType, ruleText)
		} else if (ruleType === "ytChannels") {
			res = await blockSet.addYTChannel(listType, ruleText)
		} else if (ruleType === "ytCategoryIds") {
			res = await blockSet.addYTChannel(listType, ruleText)
		} else if (ruleType === "urlRegExps") {
			res = await blockSet.addYTChannel(listType, ruleText)
		} else {
			throw new Error("Invalid rule!")
		}
		if (res.isErr()) {
			// TODO: error display
			console.log(`Error adding rule: ${res.error.message}`)
		} else {
			setRuleText("")
		}
	}

	return (
		<Box sx={{ px: 1, pb: 1 }}>
			<Stack direction="row" alignItems="center" spacing={1}>
				<Typography>Add new rule</Typography>
				<Box sx={{ p: 1 }}>
					<NativeSelect
						value={ruleType}
						inputProps={{
							name: "rule type",
							id: `${listType}-rule-type-select`,
						}}
						onChange={event => {
							setRuleType(event.target.value)
						}}
						sx={{ minWidth: 115 }}
						variant="standard"
					>
						<option value="urlPatterns">URL Pattern</option>
						<option value="ytChannels">YouTube Channel</option>
						<option value="ytCategoryIds">YouTube Category</option>
						<option value="urlRegExps">URL RegExp</option>
					</NativeSelect>
				</Box>
			</Stack>
			<Stack direction="row" alignItems="center" spacing={1}>
				<TextField
					id="rule-input"
					size="small"
					fullWidth
					placeholder={placeholders[ruleType as keyof BlockList] ?? "PLACEHOLDER NOT SET"}
					value={ruleText}
					onChange={event => setRuleText(event.target.value)}
					onKeyDown={e => {
						if (e.key === "Enter") void addCurrentRule()
					}}
				/>
				<IconButton aria-label="add rule">
					<AddRounded onClick={() => void addCurrentRule()} />
				</IconButton>
			</Stack>
		</Box>
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

	return (
		<Box>
			<Typography variant="h2" sx={{ mb: 1, textTransform: "capitalize" }}>
				{listType}
			</Typography>
			<RuleInput blockSet={blockSet} listType={listType} />
			{listDisplayNames.map(([key, name]) => (
				<BlockListDraggable
					key={key}
					blockSet={blockSet}
					listType={listType}
					listKey={key}
					listName={name}
					onChanged={() => {
						// do nothing
					}}
				/>
			))}
		</Box>
	)
}

export default BlockListInput
