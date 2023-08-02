import json
import requests


def lambda_handler(event, context):
    # test codebuild again
    query = []

    for q in event['interpretations'][0]['intent']['slots']['subject']['values']:
        query.append(q['value']['resolvedValues'][0])

    headers = {
        "Content-Type": "application/json"
    }

    es_host = 'search-photos-mswnk2t5ogfiggpjn6cofeg2iq.us-east-1.es.amazonaws.com'

    responses = []
    for label in query:
        url = f'https://{es_host}/photos/_search?q=' + label
        responses.append(requests.get(url, headers=headers,
                         auth=('rest-es1', 'U4Ptcfsa!PMkp$')).json())

    if len(responses[0]['hits']['hits']) == 0:
        for label in query:
            if label[-1] == "s":
                url = f'https://{es_host}/photos/_search?q=' + label[:-1]
                responses.append(requests.get(url, headers=headers, auth=(
                    'rest-es1', 'U4Ptcfsa!PMkp$')).json())

    # return responses
    output = []
    for resp in responses:
        if resp['hits'] != None:
            for hit in resp['hits']['hits']:
                if hit != None:
                    obj = hit['_source']['objectKey']
                    output.append(obj)

    if len(output) > 0:
        messages = []
        for i in output:
            messages.append({"contentType": "CustomPayload",
                             "content": "https://b2-photos.s3.amazonaws.com/"+i, })

        return {
            "sessionState": {
                "dialogAction": {
                    "slotToElicit": "data",
                    "type": "ElicitSlot"
                },
                "intent": {
                    "slots": {
                        "data": None,
                    },
                    "confirmationState": "None",
                    "name": "SearchIntent",
                    "state": "InProgress",
                },

            },
            "messages": messages
        }
    else:
        return {
            'statusCode': 200,
            'body': []
        }
