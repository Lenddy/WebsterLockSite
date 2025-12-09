// # TODO List (Prioritized)

// ## 🔥 High Priority – Critical Fixes
// [ ] Combine providers for users and items
// [ ] Verify user is updated and ensure getAll still works with new fetching logic
// [ ] Fix update-as-tech issue: Material Request update not reflected on GetOne view
// [ ] Fix GraphQL PubSub error: "Cannot read properties of undefined (reading 'id')"
// [ ] Ensure refetch only happens when needed; prevent unnecessary API calls
// [ ] Prevent restricted routes from appearing
//   - [ ] /user/userID
//   - [ ] /admin/user/register
// [ ] Fix refetch logic so each screen refetches ONLY its active data
// [ ] Ensure new users appear to the creator via cache update
//   - [ ] Also apply to item groups
// [ ] Add new pubsub triggers to backend & frontend
// [ ] Add GraphQL validation on Create Item
// [ ] Fix token loss in PWA by migrating to IndexedDB
// [ ] Handle multiple user sessions without overwriting localStorage
// [ ] Fix route mismatch error
//   - [ ] Cast to ObjectId failed for “allsdjfksjdf”

// ## ⚙️ Backend / Redis / Indexing
// [ ] Add Redis index for users
//   - [ ] Use hash + set pattern
//   - [ ] Map user ID to hash lookup
//   - [ ] Fetch full data from set
// [ ] Add additional PubSubs for update & delete
// [ ] Build "index" for Material Request (similar to redis demo)
// [ ] Improve backend logs & provider merging

// ## 🧪 Validation, Errors, UX
// [ ] GraphQL errors must appear directly under component inputs
// [ ] All validation UI messages should render under inputs
// [ ] Add toast notifications globally

// ## 🧭 Routing Improvements
// [ ] Create index route for /material/request/request
//   - [ ] CreateOneMaterialRequest component
// [ ] Fix pattern conflicts between:
//   - [ ] /material/request/all
//   - [ ] /material/request/:requestId/update?

// ## 🗂 UI & Data Display
// ### Users
// [ ] Allow users to edit their own profile
// [ ] Show error messages centered on tables
// [ ] Add an internal user number & allow search by number

// ### Material Requests
// [ ] Add multi-condition item selector
//   - [ ] If “for”: show dropdown of previously selected items
//   - [ ] If “w/” or “&”: dropdown of all available items
//   - [ ] Support typing custom value if not in dropdown
// [ ] Show additional input depending on condition
// [ ] Add “Not Approved” button on review screen (turn red when clicked)
// [ ] Add filters: all / approved / not approved

// ### Item Usage
// [ ] When clicking an item, show user that requested it + date
// [ ] Add filters
//   - [ ] date
//   - [ ] name
//   - [ ] number
//   - [ ] email
// [ ] Also allow filter by:
//   - [ ] size
//   - [ ] color
//   - [ ] hand

// ## ⭐ Nice to Have / UI Polish
// [ ] Add toast notifications
// [ ] Add animations / transitions later
