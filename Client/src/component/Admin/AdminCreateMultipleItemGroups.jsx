import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { get_all_item_groups } from "../../../graphQL/queries/queries";
import { create_multiple_itemGroups, create_multiple_material_requests } from "../../../graphQL/mutations/mutations";
import { get_all_users } from "../../../graphQL/queries/queries";
import Select from "react-select";
import Fuse from "fuse.js";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";

export default function AdminCreateMultipleItemsGroups() {
	const [users, setUsers] = useState([]);
	const [itemGroups, setItemGroups] = useState([
		{
			brand: "",
			itemsList: [
				{
					itemName: "",
				},
			],
		},
	]);

	// const { loading, data, error, refetch } = useQuery(get_all_users);
	// const { data: iGData, loading: iGLoading, error: iGError } = useQuery(get_all_item_groups);
	const [createNewItemGroups] = useMutation(create_multiple_itemGroups);

	const navigate = useNavigate();

	// Add a new request (with one blank row)
	const addItemGroup = () => {
		setItemGroups([
			...itemGroups,
			{
				brand: "",
				itemsList: [
					{
						itemName: "",
					},
				],
			},
		]);
	};

	// Remove a whole request
	const removeItemGroup = (igIdx) => {
		setItemGroups(itemGroups.filter((_, i) => i !== igIdx));
	};

	const addItemRow = (igIdx) => {
		const updated = [...itemGroups];
		updated[igIdx].itemsList.push({
			itemName: "",
		});
		setItemGroups(updated);
	};

	const removeItemRow = (IgIdx, rowIdx) => {
		const updated = [...itemGroups];
		updated[IgIdx].itemsList = updated[IgIdx].itemsList.filter((_, i) => i !== rowIdx);
		setItemGroups(updated);
	};

	const handleItemGroupChange = (igIdx, field, value) => {
		const updated = [...itemGroups];
		updated[igIdx][field] = value;
		setItemGroups(updated);
	};

	const handleItemChange = (igIdx, rowIdx, field, value) => {
		const updated = [...itemGroups];
		updated[igIdx].itemsList[rowIdx][field] = value;
		setItemGroups(updated);
	};

	const canAddMore = itemGroups.every((ig) => ig.brand && ig.itemsList.every((i) => i.itemName));

	//  Submit validation
	const canSubmit = canAddMore; // since it's the same rule for "everything filled"

	const submit = async (e) => {
		e.preventDefault();
		try {
			const input = itemGroups.flatMap((ig) => ({
				brand: ig.brand,
				itemsList: ig.itemsList.map((i) => ({
					itemName: i?.itemName,
				})),
			}));

			console.log("this is the input that are send  ", input);

			await createNewItemGroups({
				variables: { input },
				onCompleted: (res) => {
					console.log("Mutation success:", res.createMultipleItemGroups);
					// newMr =
					// navigate(`/material/request/${res?.createOneMaterialRequest?.id}`);
				},
				onError: (err) => {
					console.warn("Mutation success:", err);
					// newMr =
					// navigate(`/material/request/${res?.createOneMaterialRequest?.id}`);
				},
			});
		} catch (err) {
			console.error("Submit error:", err);
		}
	};

	return (
		<div>
			{/* Simple navigation/test links */}
			<div>
				<Link to={"/"} onClick={() => localStorage.removeItem("UserToken")}>
					log out
				</Link>
			</div>

			<div>
				<Link to={"/user/all"}>all users</Link>
			</div>

			<div>
				<Link to={"/material/request/all"}>all Material Requests</Link>
			</div>

			<div>
				<Link to={""}>blank</Link>
			</div>

			<form onSubmit={submit}>
				{/* Dynamic rows */}
				{itemGroups.map((ig, igIdx) => (
					<div key={igIdx} className="request-block">
						<h3>itemGroup {igIdx + 1}</h3>
						<input type="text" value={ig?.brand} onChange={(e) => handleItemGroupChange(igIdx, "brand", e.target.value)} />

						{/* Items inside request */}
						{ig.itemsList?.map((row, rowIdx) => {
							return (
								<div key={rowIdx} className="">
									{/* Item description */}

									<input type="text" value={row?.itemName} onChange={(e) => handleItemChange(igIdx, rowIdx, "itemName", e.target.value)} />

									{/* Remove item button */}
									{ig?.itemsList?.length > 1 && (
										<button type="button" onClick={() => removeItemRow(igIdx, rowIdx)}>
											Remove Item
										</button>
									)}
								</div>
							);
						})}
						{/* Item-level add button */}
						<button type="button" onClick={() => addItemRow(igIdx)} disabled={!canAddMore}>
							+ Add Item
						</button>
						{/* Remove whole request */}
						{itemGroups.length > 1 && (
							<button type="button" onClick={() => removeItemGroup(igIdx)}>
								Remove Item Group
							</button>
						)}
					</div>
				))}

				{/* Add a whole new request */}
				<button type="button" onClick={addItemGroup} disabled={!canAddMore}>
					+ Add New Item Group
				</button>
				<button type="submit" onClick={submit} disabled={!canSubmit}>
					Submit
				</button>
			</form>
			{!canAddMore && <p style={{ color: "red" }}> All required fields must be filled.</p>}
		</div>
	);
}
