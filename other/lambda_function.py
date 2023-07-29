import json
from datetime import datetime

from botocore.client import Config
import boto3, logging
import requests

def lambda_handler(E1, context):
    
    client = boto3.client('rekognition')
    
    s3 = boto3.client("s3")
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    put_image = E1['Records'][0]['s3']['object']['key']

    label_response = client.detect_labels(Image={'S3Object':{'Bucket':'b2-photos', 'Name':put_image}}, MaxLabels=10)
    
    image_meta = s3.head_object(Bucket="b2-photos", Key=put_image)
    # image_meta = s3.Object('b2-photos', put_image)\
    
    labels = []
    for label in label_response['Labels']:
        labels.append(label['Name'])
        
    logger.info('Response: {}'.format(image_meta))
    
    customLabels_meta = None
    metaTag = 'x-amz-meta-customLabels'
    if metaTag in json.loads(json.dumps(image_meta, indent=4, sort_keys=True, default=str))['ResponseMetadata']['HTTPHeaders']:
        customLabels_meta = json.loads(json.dumps(image_meta, indent=4, sort_keys=True, default=str))['ResponseMetadata']['HTTPHeaders'][metaTag]
        labels.append(customLabels_meta)
        
    elastic_object = {
        'objectKey': put_image,
        'bucket': 'b2-photos',
        'createdTimestamp': datetime.now().isoformat(timespec='seconds'),
        'labels': labels
    }
    
    es_host = "https://search-photos-mswnk2t5ogfiggpjn6cofeg2iq.us-east-1.es.amazonaws.com"
    # access_key = 'AKIAVTCRWBNNJO4BMFGF'
    # secret_key = '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'
    # auth = AWSRequestsAuth(aws_access_key=access_key,
    #                       aws_secret_access_key=secret_key,
    #                       aws_host=es_host,
    #                       aws_region='us-east-1',
    #                       aws_service='es')
    
    # es = Elasticsearch(
    #     ['https://search-photos-mswnk2t5ogfiggpjn6cofeg2iq.us-east-1.es.amazonaws.com'],
    #     http_auth=auth,
    #     use_ssl=True,
    #     verify_certs=True,
    #     connection_class=RequestsHttpConnection
    # )
    
    # es.cluster.health()

    # es.index(index="photos", elastic_object)
    
    response = requests.put(es_host+"/photos", data=elastic_object)
    
    return response.json()
