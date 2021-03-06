#My Recipes API design documentation

class *Level*
    Name:
        type: String
        desc: Name of the Level.
        req: true
        unique: true
        note: So far the following levels will be added:
            - Beginner
            - Intermediate
            - Expert
    Description:
        type: String
        desc: Level Description.
end class

enum *MealType*
     Name:
        type: String
        desc: Name of the meal type.
        req: true
        unique: true
        note: Composed by the following:
            - Appetizer
            - Breakfast
            - MainDish
            - Dessert
    Description:
        type: String
        desc: Level Description.
end enum

class *UnitOfMeasure*
    Abbrev:
        type: String
        req: true
        unique: true
        desc: Acronym or short name, like: "l" for litres, "cm3" for cubic centimeters, teaspoon, etc.
    Name:
        type: String
        req: true
        desc: like: "Litres", "Cubic centimeters", etc.
end class

class *Ingredient*
    Name: 
        type: String
        desc: Name of the ingredient
        req: true
        unique: true
    CompatibleUnits:
        type: UnitOfMeasure[]
        req: true, at least one Unit must be added.
end class

class *Recipe*
    Name: 
        type: String
        desc: Name of the recipe
        req: true
        unique: true
    Description: 
        type: String
        desc: A no more than 2 lines dish description like "An easy to cook version of the marinade sausage that our kids will love".
    EstimatedTime: 
        type: Number
        desc: Total preparation time Stored in minutes. 
    Level:
        type: Level
        desc: Represent the skill level required for this preparation.
    MealType:
        type: MealType
        desc: The type of meal this recipe is.
    Ingredients: 
        type: RecipeIngredient[]
        desc: List of ingredientes and amount of each one as other details.
    Directions:
        type: String[]
        desc: The set of directions required to prepare the recipe.
end class

class *RecipeIngredient*
    Recipe:
        type: Recipe
        desc: The recipe in which this ingredient take part.
        req: true
    Ingredient:
        type: Ingredient
        req: true
        unique: true for this recipe.
    Amount:
        type: Number
        req: true
    Unit:
        type: UnitOfMeasure
        req: true
end class


Ver modelado many to many in Mongo DB acá: http://learnmongodbthehardway.com/schema/schemabasics/

-------------------------------------------------------
Normal HTTP Status codes:

200 OK - Response to a successful GET, PUT, PATCH or DELETE. Can also be used for a POST that doesn't result in a creation.
201 Created - Response to a POST that results in a creation. Should be combined with a Location header pointing to the location of the new resource
204 No Content - Response to a successful request that won't be returning a body (like a DELETE request)

400 Bad Request - The request is malformed, such as if the body does not parse
401 Unauthorized - When no or invalid authentication details are provided. Also useful to trigger an auth popup if the API is used from a browser
403 Forbidden - When authentication succeeded but authenticated user doesn't have access to the resource
404 Not Found - When a non-existent resource is requested
405 Method Not Allowed - When an HTTP method is being requested that isn't allowed for the authenticated user
410 Gone - Indicates that the resource at this end point is no longer available. Useful as a blanket response for old API versions
415 Unsupported Media Type - If incorrect content type was provided as part of the request
422 Unprocessable Entity - Used for validation errors
429 Too Many Requests - When a request is rejected due to rate limiting

500 Internal Server Error

-------------------------------------------------------------------
API Actions
GET /items - Retrieves a full list of items.
GET /items/:id - Retrieves a specific item.
GET /items/{filter condition} - Retrieves the items that match the specified condition.
GET /items/{filter condition}/?{query parameters} - Retrieves the items that match the specified condition and applying pagination, sorting, etc, as defined in the query parameters.


POST /items - Creates a new item.
PUT /items/:id - Updates a specific item.
DELETE /items/:id - Deletes a specific item.

------------------------------------------------------------

Possible URLs:
            /model/
            /model/{ID or JSON filter}
            /model/?{query parameters}
            /model/{ID or JSON filter}?{query parameters}


Sample routes for Filtering:
GET /api/units/{ "name": { "$in": [ "U7", "U8" ] } }
GET /api/units/{ "$and": [ { "abbrev": "UNIT07" }, { "name": "U7" } ] }
GET /api/units/{ "$or" : [ { "abbrev": "UNIT07" }, { "abbrev": "UNIT12" } ] }
GET /api/units/{ "$and" : [ { "$or" : [ { "abbrev": "UNIT07" } ] },  { "$or" : [ { "abbrev": "UNIT12" } ] } ] }

Query param details:
top: Will be always number or empty.
skip: Will be always number or empty.
pop: Boolean indcating if subdocuments will be populated.
sort: String with the list of fields separated by spaces and adding a hyphen as modifier when the sort must be descendig.
    Chek this examples:   
        "FieldName1"  <- indicates to sort by FieldName1 ascending.
        "-FieldName2 FieldName3" <- Sorting by field "FieldName2" descending and then by field "FieldName3" ascending. 

-------------------------------------------------------------------------------------------------------------

**API Security improvements I**

- Filter review: The following attributes can't be part of any JSON filters submitted by a client app:
    - "publishedOn"
    - "createdBy"
    - "lastUpdateBy"
DONE
- New query parameter "owner" with the following possible values:
    "me" -> Will retrieve all the entities of the requested kind owned by the user.
    "others" -> Will retrieve only entities owned by other users.
    "any" -> Will retrieve any entity regardless of which user is the owner.
DONE
- Change the "my-recipes" component to use this new query parameter instead of include user details in the JSON filter.
DONE

**API Security improvements II**
We need to implement the following server side security features.

 - For any Requests with GET method:
  + **(PRE  VALIDATION NO DB ACCESS)** Not published entities other than Recipe or RecipeIngredient by ID or by Filter can be requested only by ADMIN users.
    DONE
 - For any Request with POST method:
  + **(PRE  VALIDATION NO DB ACCESS)** Anonymous users can't create an entity of any kind.
  + **(PRE  VALIDATION NO DB ACCESS)** Only ADMIN users can create entities other than Ingredient, Recipe and RecipeIngredient.
    DONE
 - For any Request with PUT method:
  + **(PRE  VALIDATION NO DB ACCESS)** Anonymous users can't update any entity.
  + **(PRE  VALIDATION WITH DB ACCESS)** Only the Owner can update Recipe and RecipeIngredients.
  + **(PRE  VALIDATION NO DB ACCESS)** Any other entity can be updated only by ADMIN users.
    DONE
 - For any Request with DELETE method:
  + **(PRE  VALIDATION NO DB ACCESS)** Anonymous users can't delete any entity.
  + **(PRE  VALIDATION WITH DB ACCESS)** Only the Owner can delete Recipe and RecipeIngredients.
  + **(PRE  VALIDATION NO DB ACCESS)** Any other entity can be deleted only by ADMIN users.
    DONE

REFACTORING USING ATTRS IN THE ENTITY DEFINITION:
====================================================
readNotPublishedPrivileges
  Anonymous         
  Authenticated     
  Owner			    -> Para Recipes y RecipeIngredients 
	(aplica en: _parseConditions)
  Administrators	-> Para el resto 
	(aplica en: validateAccess )

writePrivileges
  Anonymous
  Authenticated		-> Para Ingredients
    (aplica en: validateAccess)
  Owner			    -> Para Recipes y Recipe Ingredients
    (aplica en: _parseConditions)
  Administrators	-> Para el resto
    (aplica en: validateAccess)

deletePrivileges
  Anonymous
  Authenticated		
  Owner			-> Para Recipes y Recipe Ingredients
    (aplica en: _parseConditions)
  Administrators	-> Para el resto
    (aplica en: validateAccess)

-------------------------------------------------------------------------------------------------------------

iSSUE #38 SOFT DELETION
========================

Vamos a crear el siguiente atributo en todos los entities:

deletedOn: { type: Date, required: false }
    DONE

-El atributo no puede estar incluido en la data que el cliente envia para un post, (debe generar una excepción).
    DONE
-Al crear o actualizar un documento el atributo "deletedOn" deberá poseer valor "null".
    DONE
-El atributo nunca debe llegar al cliente, (debe ser eliminado del JSON).
Implementar esto en el Security service llamado desde el Servicio en los métodos add() y find()
    DONE    
-Se debe agregar una condición de filtro especial para filtrar SIEMPRE los eliminados.
    DONE
-Modificar el método DELETE para que no borre sino haga un update del atributo "deletedOn".
    algo asi como:  model.update({ _id: "XXXXXXX" }, { $set: { "deletedOn": new Date() } }
    DONE

Issues:
- Al borrar un doc que tiene un atributo en el modelo con el modificador "unique: true", no va a poder crearse otro item
con el mismo valor a pesar de ser posible porque el original fué borrado.
MItigación:
    -Quitamos el atributo unique de todos los campos.
    -Creamos a mano el indice unique correspondiente, pero esta vez incluyendo el atributo deletedOn de la siguiente forma:
        mySchema.index({ atributoUnique: 1, deletedOn: 1}, { unique: true, background: true, name: "NombredelIndice"})
    DONE

-----------------------------------------------------------------------
Cambios por migración a Heroku
================================

Nuevos DNS names:
https://micocina.herokuapp.com/
https://micocina-api.herokuapp.com/

Cambios a la API:
-----------------
Ahora para lanzar la app:
    npm start
Para lanzarla con la  config de prod:
    npm run startProd
Para depurar:
    Poner los puntos de interrupción y lanzar la tarea "Attach"

Orden tareas Feb 10th 2019:
-----------------------
v- Update Node and NPM versions.
 - Deployar a Heroku la API
 - Probar la app en local
 - Investigar deploy de Angular Apps a Heroku
 - Deployar la app a heroku
 - Probar ambiente PROD
 - continuar con desarrollo de Historia de Imagenes en Mis Recetas.

 =================================================================================

 RECIPE PICTURES:
 __________________

 Model:
 ______

 RecipePicture
    recipe: ObjectId => Reference to the Recipe
    pictureId: string => Public id of the picture as stated by the CDN provider.
        NOTE: With this id, plus the cloud name we can get the picture URL from the CDN provider with any required transformations.
    isCover: boolean => Indicates if this picture was selected by the user as the cover picture. 


=====================================================================================

Issue con save en subdocs
----------------------------

PENDIENTE: 
- Tirar atras cambios para hacer update de subdocumentos.
- Probar tirar atrás model.updateOne por model update como antes.
    https://mongoosejs.com/docs/api.html#model_Model.updateOne
    Ver que updateOne no soporta overwrite.

    Alternatozas si no funciona:
    - 
    - Agregar options: { overwrite: true }


=====================================================================================

Implement *User error* messages.
--------------------------------

Candidates:

DONE        router-data lines 84, 94: mongo DB Error E11000 indicates dup key.
DONE        data-service line 200: Update affects no documents.
DONE        data-service line 407: Delete affects no documents.
DONE        service-validator line 184: All the errors in "validateMediaUploadContent()" need to be treated as separate User errors.


==========================================================================

U S E R  E N T I T Y
---------------------

User {
    _id: ObjectId,
    providerId: string,
    name: string,
    email: string,
    details: ObjectId
}

Add index by "ProviderId"

UserDetails{
    _id: ObjectId,
    user: ObjectId,
    providerName: string;
    lastLogin: Date;
    isSocial: boolean;
    picture: string;
    emailVerified: boolean;
    isAdmin: boolean;
}

Steps for the auth process:

- After the user authenticates or signup in the provide page, a call to "/auth-callback" take place and the token is 
retrieved by the App.
- The app calls "api/management/user/{Provider user id in the token}" to get user details.
- In that endpoint we need to follow this logic:
    IF user exists with providerId == token.userId THEN
        We update the entity "User" and "UserDetails" with the data provided by the Auth provider endpoint.
    ELSE
        We create the User and UserDetails
    ENDIF

    We return the User and UserDetails.
    

CACHE
======================

v- Convertir Request contest en Middleware
 - Crear cache global.
 - Cachear en /login.
 - En el metodo _setContext(req) setear en req["context"].user el _id trayendolo de cache, si no está en cache buscarlo y después llamar a next().


----------------------

Session
    UserId
    ProviderId
    IsAdmin
    expireOn

v Cache
    Users --> Internamente crea un node-cache con un cierto TTL, o TTL = 0, (a definir)
        getByProviderId(providerId:string): User
        set(Session)

v EN Request Context:
    SI El user no está en cache:
        SI Lo busca y no lo encuentra
            Hay que asumir que es el login tras el sign up de un nuevo user, (el cache se actualizará 
                entonces en el endpoint login), entonces no crea entrada en cache.
        SINO
            Lo agrega a cache
        FINSI
    FIN SI

v En Router Management\login:
    Actualiza el user en cache tras el create or update.

v En Router POST Management\user:
    Actualiza el user en cache tras el update de preferences.
    
TODO:

v - Agregar el ttl al cache de sessionData, (tiene que removerlo de cache cuando la sesión expira: sessionData.isExpired())
v - Modificar la clase Entity tanto en APÏ como en Frontend para que CreatedBy sea una reference a User.
v - Modificar el metodo "setauditData" del data service para que guarde en createdBy and LastUpdatedBy el userId en lugar del ProviderId
v - Actualizar test classes!!!!
v - Cambiar el nombre de "user" en request context por "activeSession".

=======================================================================
User details page

 - Crear el "unless" en index JS para que no requiera auth llamar al get del endpoint "\user"
    Agregar "parseURL" como estática/shared" en request context.
 - Al devolver la data del usuario recrodar eliminar data sensible.
