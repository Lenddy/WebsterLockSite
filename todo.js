// ANCHORs - Used to indicate a section in your file
// TODOs - An item that is awaiting completion
// FIXMEs - An item that requires a bugfix
// STUBs - Used for generated default snippets
// NOTEs - An important note for a specific code section
// REVIEWs - An item that requires additional review
// SECTIONs - Used to define a region (See 'Hierarchical anchors')
// LINKs - Used to link to a file that can be opened within the editor (See 'Link Anchors')

//TODO List (Prioritized)

//TODO 🔥 High Priority – Critical Fixes
// [x] Combine providers for users , request ,and items
// [x] Verify user is updated and ensure getAll still works with new fetching logic
// [x] Fix update-as-tech issue: Material Request update not reflected on GetOne view
// [x] Fix GraphQL PubSub error: "Cannot read properties of undefined (reading 'id')"
// [x] Ensure refetch only happens when needed; prevent unnecessary API calls
// [x] Prevent restricted routes from appearing
//   - [x] /user/userID
//   - [x] /admin/user/register
// [x] Fix refetch logic so each screen refetches ONLY its active data
// [x] Ensure new users appear to the creator via cache update
//   - [x] Also apply to item groups
// [x] Add new pubsub triggers to backend & frontend
// [x] Add GraphQL validation on Create Item
// [x] Fix token loss in PWA by migrating to IndexedDB
// [x] Handle multiple user sessions without overwriting localStorage
// [x] Fix route mismatch error
//   - [x] Cast to ObjectId failed for “allsdjfksjdf”

//TODO ⚙️ Backend / Redis / Indexing
// [ ] Add Redis index for users
//   - [ ] Use hash + set pattern
//   - [ ] Map user ID to hash lookup
//   - [ ] Fetch full data from set
// [ ] Add additional PubSubs for update & delete
// [ ] Build "index" for Material Request (similar to redis demo)
// [ ] Improve backend logs & provider merging

//TODO 🧪 Validation, Errors, UX
// [x] GraphQL errors must appear directly under component inputs
// [x] Add toast notifications globally

//TODO 🧭 Routing Improvements
// [ ] Create index route for /material/request/request
//   - [ ] CreateOneMaterialRequest component
// [x] Fix pattern conflicts between:
//   - [x] /material/request/all
//   - [x] /material/request/:requestId/update?

//TODO 🗂 UI & Data Display
//[x] make sure all the ux/ui works as intended

// ### Users
// [x] Allow users to edit their own profile
// [x] Add an internal user number & allow search by number

// ### Material Requests
// [ ] Add multi-condition item selector
//   - [ ] If “for”: show dropdown of previously selected items
//   - [ ] If “w/” or “&”: dropdown of all available items
//   - [ ] Support typing custom value if not in dropdown
// [ ] Show additional input depending on condition
// [x] Add “Not Approved” button on review screen (turn red when clicked)
// [x] Add filters: all / approved / not approved

// ### Item Usage
// [x] When clicking an item, show user that requested it + date
// [x] Add filters
//   - [x] date
//   - [x] name
//   - [x] number
//   - [x] email
// [ ] Also allow filter by:
//   - [ ] size
//   - [ ] color
//   - [ ] hand

// ## ⭐ Nice to Have / UI Polish
// [x] Add toast notifications

//!!!! pub sub
