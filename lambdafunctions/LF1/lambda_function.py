import json
from datetime import datetime

from botocore.client import Config
import boto3, logging
import requests
# from elasticsearch import Elasticsearch
from aws_requests_auth.aws_auth import AWSRequestsAuth
import base64

def lambda_handler(E1, context):
    
    client = boto3.client('rekognition')
    
    s3 = boto3.client("s3")
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    put_image = E1['Records'][0]['s3']['object']['key']
    
    image = s3.get_object(Bucket="b2-photos", Key=put_image)
    buffer = image["Body"].read()
    # return json.dumps(image, indent=4, sort_keys=True, default=str)
    # return buffer[22:]
    
    label_response = client.detect_labels(Image={'Bytes':base64.decodebytes(buffer[22:])}, MaxLabels=10)

    # label_response = client.detect_labels(Image={'S3Object':{'Bucket':'b2-photos', 'Name':put_image}}, MaxLabels=10)
    
    image_meta = s3.head_object(Bucket="b2-photos", Key=put_image)
    # image_meta = s3.Object('b2-photos', put_image)\
    # return json.loads(json.dumps(image_meta, indent=4, sort_keys=True, default=str))
    labels = []
    for label in label_response['Labels']:
        labels.append(label['Name'])
        
    logger.info('Response: {}'.format(image_meta))
    
    
    customLabels_meta = None
    metaTag = 'x-amz-meta-customlabels'
    if metaTag in json.loads(json.dumps(image_meta, indent=4, sort_keys=True, default=str))['Metadata'].keys():
        customLabels_meta = json.loads(json.dumps(image_meta, indent=4, sort_keys=True, default=str))['Metadata'][metaTag]
        labels.append(customLabels_meta)

    elastic_object = {
        'objectKey': put_image,
        'bucket': 'b2-photos',
        'createdTimestamp': datetime.now().isoformat(timespec='seconds'),
        'labels': labels
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    es_host = "search-photos-mswnk2t5ogfiggpjn6cofeg2iq.us-east-1.es.amazonaws.com"
    # access_key = 'AKIAVTCRWBNNJO4BMFGF'
    # secret_key = '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'
    # auth = AWSRequestsAuth(aws_access_key=access_key,
    #                       aws_secret_access_key=secret_key,
    #                       aws_host=es_host,
    #                       aws_region='us-east-1',
    #                       aws_service='es')
                          
    url = f'https://{es_host}/photos/0'
    
    # es = Elasticsearch(
    #     ['https://search-photos-mswnk2t5ogfiggpjn6cofeg2iq.us-east-1.es.amazonaws.com'],
    #     http_auth=auth
    # )
    # # try post request to 
    # es.cluster.health()

    # es.index(index="photos", elastic_object)
    response = requests.post(url, data=json.dumps(elastic_object).encode('utf-8'), headers=headers, auth=('rest-es1', 'U4Ptcfsa!PMkp$'))
    
    return response.json()
