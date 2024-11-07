import azure.functions as func
import logging

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)

@app.route(route="http_trigger")
def http_trigger(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Python HTTP trigger function processed a request.')

    params = {
        'url': 'https://sightengine.com/assets/img/examples/example-prop-c1.jpg',
        'models': 'genai',
        'api_user': '{api_user}',
        'api_secret': '{api_secret}'
    }
    r = requests.get('https://api.sightengine.com/1.0/check.json', params=params)

    output = json.loads(r.text)

    if output >= 0.90:
        return func.HttpResponse(f"Detected as AI.")
    else:
        return func.HttpResponse(f"Not AI")