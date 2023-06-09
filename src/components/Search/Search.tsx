import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons"
import { useState } from "react"
import {
	selectKeywords,
	useAppDispatch,
	useAppSelector
} from "@/hooks/redux";
import {
	clearKeywords,
	setKeybindsActive,
	setKeywords
} from "@/slices/entriesSlice";
import { NewListButton } from "@/components/ListButtons/NewListButton";
import { EditListButton } from "@/components/ListButtons/EditListButton";
import { DeleteListButton } from "@/components/ListButtons/DeleteListButton";

export const Search = () => {
	const [visible, setVisible] = useState(false);
	const dispatch = useAppDispatch();
	const keywords = useAppSelector(selectKeywords);

	const handleSearchToggle = () => {
		setVisible(prev => !prev);
		if (visible) {
			dispatch(clearKeywords());
		}
	}

	const handleFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
		const keywords = event.target.value.trim();
		dispatch(setKeywords(keywords));
	}

	const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
		event.preventDefault();
		if(event.key === 'Escape') {
			setVisible(false);
			dispatch(clearKeywords());
		}
	};

	return (
		<div className="search active">
			<div className="flex justify-center items-center gap-1">
				<button
					type="button"
					className="search__btn"
					aria-expanded={visible}
					onClick={handleSearchToggle}
				>
					<FontAwesomeIcon icon={faMagnifyingGlass} size="lg" />
				</button>
				<NewListButton />
				<EditListButton />
				<DeleteListButton />
			</div>
			{visible && (
				<input
					type="text"
					value={keywords}
					className="search__input"
					onChange={handleFilter}
					onKeyUp={handleKeyUp}
					onFocus={() => dispatch(setKeybindsActive(false))}
					onBlur={() => dispatch(setKeybindsActive(true))}
				/>
			)}
		</div>
	)
}