# Generated by Django 5.0.2 on 2024-02-15 11:16

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Tag',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=63, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name='Puzzle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fen', models.CharField(max_length=100)),
                ('solution', models.CharField(max_length=255)),
                ('elo_rating', models.IntegerField(default=1000)),
                ('description', models.CharField(max_length=255)),
                ('tags', models.ManyToManyField(related_name='puzzles', to='puzzles.tag')),
            ],
        ),
    ]
