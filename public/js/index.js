function redirectFromApi(resourceUrl) {
    window.open('http://openprocurement-crypto.github.io/?resourceUrl=' + resourceUrl);
}
function redirectToWatch(apiHost, apiVersion, resourceType){
    window.open('/observe?apiUrl=' + apiHost + '/api/' + apiVersion + '&resourceType=' + resourceType + '&limit=100');
}