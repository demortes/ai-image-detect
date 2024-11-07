import azure.functions as func
import logging
import json
import requests
import os

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)

@app.function_name(name="Detect")
@app.route(route="http_trigger")
def detect(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Python HTTP trigger function processed a request.')
    imgUrl = req.params.get('url')
    params = {
        'url': 'https://sightengine.com/assets/img/examples/example-prop-c1.jpg',
        'models': 'genai',
        'api_user': os.getenv("sightengine_api_user"),
        'api_secret': os.getenv("sightenvigne_api_secret")
    }
    r = requests.get('https://api.sightengine.com/1.0/check.json', params=params)

    output = json.loads(r.text)

    if output >= 0.90:
        return func.HttpResponse(f"Detected as AI.")
    else:
        return func.HttpResponse(f"Not AI")