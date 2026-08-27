terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

provider "aws" {
  region = "ap-south-1"
}

resource "aws_instance" "sre_server" {
  ami           = "ami-01a00762f46d584a1"
  instance_type = "t2.medium"

  key_name = aws_key_pair.sre_key.key_name

  vpc_security_group_ids = [
    aws_security_group.sre_server.id
  ]

  tags = {
    Name = "sre-nginx-server"
  }
}
