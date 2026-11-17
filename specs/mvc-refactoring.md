# Supplied Lesson 03 MVC refactoring specification

Before editing any files, inspect the existing project and present:
An inventory of the existing routes and behaviour 
Your proposed MVC folder structure and file mapping 
A staged migration plan
Wait for my approval before editing any files.
Refactor this existing Express + MySQL + EJS application into a clean MVC architecture without changing its current functionality, routes, database behaviour, or user-facing behaviour.
Requirements
Keep the application working exactly as it does now.
Do not add new features, pages, endpoints, fields, validation rules or UI changes.
Preserve all existing:
Route methods and URLs
Redirects and query parameters
Flash messages and sessions
Login and logout flow
Admin access checks
File-upload behaviour
MySQL operations
Error and access-denied responses
Use the following MVC structure:
PetCareApp
/
├
── 
app.js
├
── 
config/
│   
├
── 
db.js
│   └── upload.js
├
── 
routes/
├
── 
controllers/
├
── 
models/
├
── 
middleware/
│   └── auth.js
├
── 
helpers/
│   └── hash.js
├
── 
views/
└── public/
Keep app.js responsible for application setup, middleware registration, router mounting and starting the server.
Place MySQL connection setup in config/db.js.
Place 
multer
 configuration in config/upload.js.
Place request-processing functions such as 
isLoggedIn
 and 
isAdmin
 in middleware/auth.js.
Preserve the current SHA-256 password-hashing behaviour in helpers/hash.js.
Move all SQL and database operations into Model modules.
Move feature-specific request and response handling into Controller modules.
Keep Routes thin. Routes should declare only the HTTP method, URL, middleware and Controller function.
Keep the existing EJS templates unchanged.
Pass the same data and variable names to each 
res.render
(...) call.
Maintain the existing database schema, table names and field names.
Preserve the existing SQL behaviour and results.
Functionality to preserve
Sign-up
Login and logout
Admin dashboard
Admin user listing and user details
User deletion
Pet creation and image upload
Journal listing and selected-pet filtering
Journal creation, editing and deletion
Journal search
User-role checks
Important constraints
This must be a structural refactor only.
Do not redesign or improve the application’s behaviour.
Do not add or remove routes.
Do not change HTTP methods, middleware order, redirects, messages or template variables.
Do not change the database schema.
Do not replace SHA-256 with another hashing algorithm.
Do not implement unrelated security or design improvements.
Completion criteria
The 
refactor
 is complete when:
The application retains the same routes and observable behaviour.
All SQL and database operations 
are located in
 Models.
Feature-specific request and response handling 
is located in
 Controllers.
Routes are thin.
isLoggedIn
 and 
isAdmin
 
are located in
 middleware/auth.js.
MySQL and 
multer
 setup 
are located in
 config/.
app.js contains only application setup, middleware registration, router mounting and server startup.
The existing EJS templates receive the same data as before.
After receiving approval, perform the refactor without adding unrelated explanations, features or design improvements.
