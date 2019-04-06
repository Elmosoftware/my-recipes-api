// @ts-check

const NodeCache = require( "node-cache" );

/**
 * User session cache.
 */
class SessionCache {

    constructor() { 
        console.log("BUILDING SESSION CACHE!!!");
        this.cache = new NodeCache();  
    }

    /**
     * Add or update a user session information in the cache
     * @param {SessionData} session 
     */
    set(session){
        let ttl = 0;

        if (session && session.providerId) {
            
            if (session.hasExpiration) {
                ttl = session.getRemainingSeconds();
            }

            this.cache.set(session.providerId, session, ttl)
        }
        else {
            throw new Error(`Provided session object is a null reference or is not a "SessionData" object.`)
        }        
    }

    /**
     * Returns a *"SessionData"* object with the session information of one specific user by his "providerId".
     * If there is no session it will return a null value.
     * @param {string} providerId Session Provider id to search for.
     * @returns SessionData
     */
    getByProviderId(providerId){
        return this.cache.get(providerId);
    }   
}

class SessionData {

    constructor(providerId, expireOn = null, userId = "", isAdmin = false){
        this.providerId = providerId;
        this.expireOn = expireOn;
        this.userId = userId;
        this.isAdmin = isAdmin;
    }

    get hasExpiration() {
        return Boolean(this.expireOn);
    }

    getRemainingSeconds() {
        let now = Date.now();

        if (this.hasExpiration) {
            return Math.round((this.expireOn - now) / 1000);
        }
        else { //Expiration is not mandatory. If this is the case, token never expires:
            return Number.MAX_SAFE_INTEGER;
        }        
    }   

    get isExpired() {
        return this.hasExpiration && this.getRemainingSeconds() <= 0;
    }    
}

var sessionCache = new SessionCache();

module.exports = { SessionData, sessionCache};
