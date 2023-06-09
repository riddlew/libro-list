import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
	EntriesSliceState,
	EntriesSliceUpdateData,
	List,
	NewEntry
} from '@/types';
import {
	addListToStorage,
	deleteListFromStorage,
	getListsFromStorage,
	loadListFromStorage,
	saveListToStorage,
	getCurrentListFromStorage,
	saveCurrentListToStorage,
	importStorage
} from '@/storage';
import {v4 as uuidv4} from 'uuid'
import toast from 'react-hot-toast'

const initialState: EntriesSliceState = {
	lists: [],
	currentList: getCurrentListFromStorage(),
	list: [],
	filtered: [],
	keywords: '',
	listIndex: -1,
	keybindsActive: true,
};

export const entriesSlice = createSlice({
	name: 'entries',
	initialState,
	reducers: {
		updateEntryById: (state, action: PayloadAction<EntriesSliceUpdateData>) => {
			const idx = state.list.findIndex(item => item.id === action.payload.id);
			const filteredIdx = state.filtered.findIndex(item => item.id === action.payload.id);

			if(idx >= 0) {
				state.list[idx] = {
					...state.list[idx],
					...action.payload.data
				};
				state.filtered[filteredIdx] = {
					...state.filtered[filteredIdx],
					...action.payload.data
				}
			}

			if(!saveListToStorage(state.currentList, state.list)) {
				toast.error('Error occurred while saving the list');
			}
		},
		filterEntries: (state, action: PayloadAction<string>) => {
			const keywords = action.payload.trim();
			if (keywords === "")
				state.filtered = state.list;

			const keywordsGlob = keywords.split(' ').join('.*');
			const regex = new RegExp(`${keywordsGlob}`, 'i');
			state.filtered = state.list.filter(entry => regex.test(entry.title));
		},
		addEntry: (state, action: PayloadAction<NewEntry>) => {
			let uuid = uuidv4();
			while (state.list.find(entry => entry.id === uuid)) {
				uuid = uuidv4();
			}
			const newItem = {
				...action.payload.data,
				id: uuid,
				chapter: +action.payload.data.chapter,
			};
			state.list.push(newItem);
			if(saveListToStorage(action.payload.listName, state.list)) {
				toast.success('Entry successfully added');
				entriesSlice.caseReducers.filterEntries(state, {
					type: 'filterEntries',
					payload: state.keywords
				});
			} else {
				toast.error('Failed to create new entry');
			}
		},
		removeEntry: (state, action: PayloadAction<string>) => {
			const idx = state.list.findIndex(entry => entry.id === action.payload);
			if (idx > -1) {
				const removed = state.list.splice(idx, 1)[0];
				entriesSlice.caseReducers.filterEntries(state, {
					type: 'filterEntries',
					payload: state.keywords
				});
				if(saveListToStorage(state.currentList, state.list)) {
					toast.success(<div><strong>{removed.title}</strong> has been removed from the list</div>);
				} else {
					toast.error(<div>Error: unable to remove <strong>{removed.title}</strong></div>);
				}
			}
		},
		loadList: (state, action: PayloadAction<string>) => {
			const data = loadListFromStorage(action.payload);

			if (data) {
				state.currentList = action.payload;
				state.list = state.filtered = data;
				saveCurrentListToStorage(action.payload);
			} else {
				state.currentList = '';
				state.list = state.filtered = [];
				toast.error(<div>Failed to load the selected list <strong>{action.payload}</strong></div>);
				console.error(`Failed to load the selected list "${action.payload}"`)
			}

			state.listIndex = -1;
		},
		loadLists: (state) => {
			state.lists = getListsFromStorage();
		},
		editList: (state, action: PayloadAction<List>) => {
			const currIdx = state.lists.findIndex(l => l.slug === action.payload.slug);
			const newSlug = action.payload.name.replaceAll(' ', '_').toLowerCase();
			state.currentList = newSlug;

			if (currIdx > -1) {
				const listData = state.lists[currIdx]
				const data = loadListFromStorage(listData.slug);

				if (data) {
					deleteListFromStorage(listData.slug)
					addListToStorage(
						action.payload.name,
						newSlug,
						{
							index: currIdx,
							data
						}
					);
					state.lists[currIdx] = {
						name: action.payload.name,
						slug: newSlug,
					};
					entriesSlice.caseReducers.loadList(state, {
						type: 'removeList',
						payload: newSlug,
					});

				}

				toast.success(<div>List <strong>{listData.name}</strong> has been renamed to <strong>{action.payload.name}</strong></div>);
			}
		},
		// removeBookById: (state, payload) => {

		// },
		addList: (state, action: PayloadAction<string>) => {
			const slug = action.payload.replaceAll(' ', '_').toLowerCase();

			if(addListToStorage(action.payload, slug)) {
				toast.success(<div>List <strong>{action.payload}</strong> has been created</div>);
			} else {
				toast.error(<div>Unable to create list <strong>{action.payload}</strong></div>);
			}

			state.lists = [
				...state.lists,
				{
					name: action.payload,
					slug
				}
			];
			state.currentList = slug;
			entriesSlice.caseReducers.loadList(state, {
				type: 'loadList',
				payload: slug,
			});
		},
		removeList: (state, action: PayloadAction<string>) => {
			const deletedName = deleteListFromStorage(action.payload);
			if(deletedName !== '') {
				toast.success(<div><strong>{deletedName}</strong> has been deleted</div>);
			} else {
				toast.error(<div>Unable to delete list <strong>{deletedName}</strong></div>);
			}

			entriesSlice.caseReducers.loadLists(state);

			// Load a different list
			if (state.lists.length > 0) {
				entriesSlice.caseReducers.loadList(state, {
					type: 'removeList',
					payload: state.lists[0].slug,
				});

				state.lists = state.lists.filter(list => list.slug !== action.payload);
			} else {
				state.list = state.filtered = [];
				state.currentList = '';
			}
		},
		setKeywords: (state, action: PayloadAction<string>) => {
			state.keywords = action.payload;
			entriesSlice.caseReducers.filterEntries(state, {
				type: 'filterEntries',
				payload: action.payload,
			});
		},
		clearKeywords: (state) => {
			state.keywords = '';
			entriesSlice.caseReducers.filterEntries(state, {
				type: 'filterEntries',
				payload: '',
			});
		},
		updateListIndex: (state, action: PayloadAction<number>) => {
			if (action.payload >= state.filtered.length) {
				state.listIndex = 0;
			} else if (action.payload < 0) {
				state.listIndex = state.filtered.length - 1;
			} else {
				state.listIndex = action.payload;
			}
		},
		setKeybindsActive: (state, action: PayloadAction<boolean>) => {
			state.keybindsActive = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(importDataAsync.fulfilled, (state) => {
			entriesSlice.caseReducers.loadLists(state);
			entriesSlice.caseReducers.loadList(state, {
				type: 'loadList',
				payload: state.lists[0].slug,
			});
		});
	}
});

export const importDataAsync = createAsyncThunk(
	'entries/importData',
	async(data: string) => {
		await importStorage(data);
	}
)

export const {
	updateEntryById,
	filterEntries,
	addEntry,
	removeEntry,
	loadList,
	loadLists,
	editList,
	addList,
	removeList,
	setKeywords,
	clearKeywords,
	updateListIndex,
	setKeybindsActive,
} = entriesSlice.actions;

export default entriesSlice.reducer;